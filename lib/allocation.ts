import { Prisma } from '@prisma/client'
import { prisma } from './db'

// ─── Business Rules ────────────────────────────────────────────────────────────

/** Providers that MUST be included for each service (if quota available) */
export const MANDATORY: Record<number, number[]> = {
  1: [1],
  2: [5],
  3: [1, 4],
}

/** Fair-allocation pool for each service (round-robin rotation) */
export const FAIR_POOL: Record<number, number[]> = {
  1: [2, 3, 4],
  2: [6, 7, 8],
  3: [2, 3, 5, 6, 7, 8],
}

/** How many slots must be filled from the fair pool */
export const FAIR_SLOTS: Record<number, number> = {
  1: 2,
  2: 2,
  3: 1,
}

export const SERVICE_NAMES: Record<number, string> = {
  1: 'Home Shifting',
  2: 'Office Relocation',
  3: 'Vehicle Transport',
}

// ─── Allocation Engine ─────────────────────────────────────────────────────────

type TxClient = Omit<
  typeof prisma,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>

/**
 * Allocates providers to a lead inside a serializable transaction.
 *
 * Strategy:
 *  1. Lock the allocation_state row for this service to prevent races.
 *  2. Gather current quota data for all candidate providers.
 *  3. Assign mandatory providers (skip if quota exhausted).
 *  4. Fill remaining slots from the fair pool using round-robin, advancing
 *     the pool_index so subsequent calls rotate correctly.
 *  5. Persist the updated pool_index before returning.
 */
export async function allocateProviders(
  tx: TxClient,
  serviceType: number
): Promise<number[]> {
  // 1. Lock allocation state row for this service type
  const states = await tx.$queryRaw<{ pool_index: number }[]>`
    SELECT pool_index FROM allocation_state
    WHERE service_type = ${serviceType}
    FOR UPDATE
  `

  if (states.length === 0) {
    throw new Error(`No allocation state found for service type ${serviceType}`)
  }

  let poolIndex = Number(states[0].pool_index)

  const mandatory = MANDATORY[serviceType] ?? []
  const pool = FAIR_POOL[serviceType] ?? []
  const fairSlotsNeeded = FAIR_SLOTS[serviceType] ?? 0

  // 2. Get current quota data for all relevant providers
  const allCandidateIds = Array.from(new Set([...mandatory, ...pool]))
  const providers = await tx.provider.findMany({
    where: { id: { in: allCandidateIds } },
    select: { id: true, leadsThisMonth: true, monthlyQuota: true },
  })

  const quotaMap = new Map(
    providers.map((p) => [p.id, p.monthlyQuota - p.leadsThisMonth])
  )

  const hasQuota = (id: number) => (quotaMap.get(id) ?? 0) > 0

  // 3. Assign mandatory providers
  const assigned: number[] = []
  for (const id of mandatory) {
    if (hasQuota(id)) assigned.push(id)
  }

  // 4. Fill remaining slots from fair pool using round-robin
  const slotsRemaining = 3 - assigned.length
  const fairNeeded = Math.min(fairSlotsNeeded, slotsRemaining)

  if (pool.length > 0 && fairNeeded > 0) {
    let added = 0
    let checked = 0

    while (added < fairNeeded && checked < pool.length) {
      const candidate = pool[poolIndex % pool.length]
      poolIndex++
      checked++

      // Skip if already assigned (mandatory overlap) or quota exhausted
      if (!assigned.includes(candidate) && hasQuota(candidate)) {
        assigned.push(candidate)
        added++
      }
    }

    // Persist updated pool_index so next call rotates correctly
    await tx.$executeRaw`
      UPDATE allocation_state SET pool_index = ${poolIndex}
      WHERE service_type = ${serviceType}
    `
  }

  return assigned
}

// ─── Transactional Lead Creation ───────────────────────────────────────────────

export interface CreateLeadInput {
  name: string
  phone: string
  city: string
  serviceType: number
  description: string
}

export async function createLeadWithAllocation(input: CreateLeadInput) {
  return prisma.$transaction(
    async (tx) => {
      // Create the lead (unique constraint on phone+service enforced by DB)
      const lead = await tx.lead.create({
        data: {
          name: input.name,
          phone: input.phone,
          city: input.city,
          serviceType: input.serviceType,
          description: input.description,
        },
      })

      // Allocate providers within the same transaction
      const providerIds = await allocateProviders(tx, input.serviceType)

      if (providerIds.length === 0) {
        throw new Error('No providers available with remaining quota')
      }

      // Create assignment records
      await tx.leadAssignment.createMany({
        data: providerIds.map((pid) => ({
          leadId: lead.id,
          providerId: pid,
        })),
      })

      // Increment lead count for each assigned provider
      await tx.provider.updateMany({
        where: { id: { in: providerIds } },
        data: { leadsThisMonth: { increment: 1 } },
      })

      return { lead, providerIds }
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  )
}
