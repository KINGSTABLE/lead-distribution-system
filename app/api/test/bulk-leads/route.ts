import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { createLeadWithAllocation, SERVICE_NAMES } from '@/lib/allocation'

export const runtime = 'edge'

const CITIES   = ['Mumbai','Delhi','Bangalore','Chennai','Hyderabad','Pune','Kolkata','Ahmedabad','Jaipur','Surat']
const SERVICES = [1, 2, 3]
const NAMES    = ['Aarav Sharma','Diya Patel','Rohan Mehta','Priya Singh','Arjun Kumar',
                  'Ananya Gupta','Vikram Joshi','Sneha Verma','Rahul Nair','Kavya Reddy']

/**
 * Fires N leads simultaneously (Promise.allSettled) to stress-test
 * Cloudflare D1's write serialisation under concurrency.
 */
export async function POST(req: NextRequest) {
  const body  = await req.json().catch(() => ({})) as Record<string, unknown>
  const count = Math.min(Number(body.count ?? 10), 20)
  const ts    = Date.now()
  const db    = getDB()

  const tasks = Array.from({ length: count }, (_, i) => {
    const svc = SERVICES[i % SERVICES.length]
    return createLeadWithAllocation(db, {
      name:        NAMES[i % NAMES.length],
      phone:       `900000${ts.toString().slice(-4)}${String(i).padStart(2, '0')}`,
      city:        CITIES[i % CITIES.length],
      serviceType: svc,
      description: `Bulk test lead #${i + 1} for ${SERVICE_NAMES[svc]}`,
    })
  })

  const results = await Promise.allSettled(tasks)

  const succeeded = results.filter((r) => r.status === 'fulfilled')
  const failed    = results.filter((r) => r.status === 'rejected')

  return NextResponse.json({
    total:     count,
    succeeded: succeeded.length,
    failed:    failed.length,
    errors:    failed.map((r) => (r as PromiseRejectedResult).reason?.message),
    leads:     succeeded.map((r) => {
      const v = (r as PromiseFulfilledResult<{ leadId: number; providerIds: number[] }>).value
      return { leadId: v.leadId, assignedProviders: v.providerIds }
    }),
  })
}
