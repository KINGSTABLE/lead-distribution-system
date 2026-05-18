import { NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { providers, allocationState } from '@/lib/schema'

export const runtime = 'edge'

export async function POST() {
  const db = getDB()
  await db.transaction(async (tx) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (tx as any).update(providers).set({ leadsThisMonth: 0 })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (tx as any).update(allocationState).set({ poolIndex: 0 })
  })
  return NextResponse.json({
    success: true,
    message: 'All provider quotas reset and allocation indices cleared.',
  })
}
