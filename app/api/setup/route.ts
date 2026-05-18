import { NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { providers, allocationState } from '@/lib/schema'

export const runtime = 'edge'

/** Idempotent first-deploy seed — safe to call multiple times. */
export async function GET() {
  try {
    const db = getDB()
    const existing = await db.select().from(providers).limit(1)
    if (existing.length > 0) {
      return NextResponse.json({ status: 'already_seeded', providers: existing.length })
    }

    await db.transaction(async (tx) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const t = tx as any
      await t.insert(providers).values([
        { id: 1, name: 'Provider 1', serviceIds: '[1,3]', monthlyQuota: 10, leadsThisMonth: 0 },
        { id: 2, name: 'Provider 2', serviceIds: '[1,3]', monthlyQuota: 10, leadsThisMonth: 0 },
        { id: 3, name: 'Provider 3', serviceIds: '[1,3]', monthlyQuota: 10, leadsThisMonth: 0 },
        { id: 4, name: 'Provider 4', serviceIds: '[1,3]', monthlyQuota: 10, leadsThisMonth: 0 },
        { id: 5, name: 'Provider 5', serviceIds: '[2,3]', monthlyQuota: 10, leadsThisMonth: 0 },
        { id: 6, name: 'Provider 6', serviceIds: '[2,3]', monthlyQuota: 10, leadsThisMonth: 0 },
        { id: 7, name: 'Provider 7', serviceIds: '[2,3]', monthlyQuota: 10, leadsThisMonth: 0 },
        { id: 8, name: 'Provider 8', serviceIds: '[2,3]', monthlyQuota: 10, leadsThisMonth: 0 },
      ])
      await t.insert(allocationState).values([
        { serviceType: 1, poolIndex: 0 },
        { serviceType: 2, poolIndex: 0 },
        { serviceType: 3, poolIndex: 0 },
      ])
    })

    return NextResponse.json({ status: 'seeded', message: '8 providers seeded.' })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
