import { eq, inArray, sql } from 'drizzle-orm'
import { providers, leads, leadAssignments, allocationState } from './schema'
import type { DB } from './db'

// ─── Business Rules ────────────────────────────────────────────────────────────

export const MANDATORY: Record<number, number[]> = {
  1: [1],
  2: [5],
  3: [1, 4],
}

export const FAIR_POOL: Record<number, number[]> = {
  1: [2, 3, 4],
  2: [6, 7, 8],
  3: [2, 3, 5, 6, 7, 8],
}

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

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface CreateLeadInput {
  name: string
  phone: string
  city: string
  serviceType: number
  description: string
}

// Drizzle transaction type alias (works for both D1 db and tx clients)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDB = any

// ─── Allocation Engine ─────────────────────────────────────────────────────────

/**
 * Selects providers for a service using round-robin fair allocation.
 * Runs inside the same D1 transaction as lead creation for atomicity.
 *
 * Concurrency note: Cloudflare D1 is single-writer — all writes are serialized
 * at the D1 coordinator, making this inherently race-free without explicit locks.
 * The pool_index read-modify-write is atomic within the D1 transaction.
 */
async function allocateProvidersInTx(tx: AnyDB, serviceType: number): Promise<number[]> {
  const [state] = await tx
    .select()
    .from(allocationState)
    .where(eq(allocationState.serviceType, serviceType))

  if (!state) throw new Error(`Allocation state missing for service ${serviceType}`)

  let poolIndex = state.poolIndex

  const mandatory = MANDATORY[serviceType] ?? []
  const pool = FAIR_POOL[serviceType] ?? []
  const fairSlotsNeeded = FAIR_SLOTS[serviceType] ?? 0

  // Fetch quota data for all candidate providers
  const allCandidateIds = Array.from(new Set([...mandatory, ...pool]))
  const providerRows = await tx
    .select({
      id: providers.id,
      leadsThisMonth: providers.leadsThisMonth,
      monthlyQuota: providers.monthlyQuota,
    })
    .from(providers)
    .where(inArray(providers.id, allCandidateIds))

  const remaining = new Map<number, number>(
    (providerRows as { id: number; leadsThisMonth: number; monthlyQuota: number }[])
      .map((p) => [p.id, p.monthlyQuota - p.leadsThisMonth])
  )
  const hasQuota = (id: number) => (remaining.get(id) ?? 0) > 0

  // 1. Mandatory providers
  const assigned: number[] = []
  for (const id of mandatory) {
    if (hasQuota(id)) assigned.push(id)
  }

  // 2. Fair pool — round-robin from persisted pool_index
  const slotsRemaining = 3 - assigned.length
  const fairNeeded = Math.min(fairSlotsNeeded, slotsRemaining)

  if (pool.length > 0 && fairNeeded > 0) {
    let added = 0, checked = 0
    while (added < fairNeeded && checked < pool.length) {
      const candidate = pool[poolIndex % pool.length]
      poolIndex++
      checked++
      if (!assigned.includes(candidate) && hasQuota(candidate)) {
        assigned.push(candidate)
        added++
      }
    }

    // Persist updated pool_index (atomic within transaction)
    await tx
      .update(allocationState)
      .set({ poolIndex })
      .where(eq(allocationState.serviceType, serviceType))
  }

  return assigned
}

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Creates a lead and assigns providers in a single D1 transaction.
 * Throws on duplicate (phone + service) — caller handles the 409 response.
 */
export async function createLeadWithAllocation(
  db: DB,
  input: CreateLeadInput
): Promise<{ leadId: number; providerIds: number[] }> {
  return db.transaction(async (tx: AnyDB) => {
    const now = new Date()

    // Insert lead (unique constraint throws on duplicate phone+service)
    const insertResult = await tx.insert(leads).values({
      name: input.name,
      phone: input.phone,
      city: input.city,
      serviceType: input.serviceType,
      description: input.description,
      createdAt: now,
    })

    const leadId = Number(insertResult.meta?.last_row_id ?? insertResult.lastInsertRowid)

    // Allocate providers within the same transaction
    const providerIds = await allocateProvidersInTx(tx, input.serviceType)
    if (providerIds.length === 0) throw new Error('No providers available with remaining quota')

    // Create assignment records
    await tx.insert(leadAssignments).values(
      providerIds.map((pid: number) => ({ leadId, providerId: pid, assignedAt: now }))
    )

    // Increment lead counts atomically
    await Promise.all(
      providerIds.map((pid: number) =>
        tx
          .update(providers)
          .set({ leadsThisMonth: sql`leads_this_month + 1` })
          .where(eq(providers.id, pid))
      )
    )

    return { leadId, providerIds }
  })
}
