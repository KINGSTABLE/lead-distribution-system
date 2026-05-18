import { NextRequest, NextResponse } from 'next/server'
import { createLeadWithAllocation, SERVICE_NAMES } from '@/lib/allocation'

const CITIES = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Hyderabad', 'Pune', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Surat']
const SERVICES = [1, 2, 3]
const NAMES = ['Aarav Sharma', 'Diya Patel', 'Rohan Mehta', 'Priya Singh', 'Arjun Kumar',
  'Ananya Gupta', 'Vikram Joshi', 'Sneha Verma', 'Rahul Nair', 'Kavya Reddy']

/**
 * Generates 10 leads simultaneously to test concurrency handling.
 * Uses Promise.allSettled so partial failures are reported, not thrown.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const count = Math.min(Number(body.count ?? 10), 20)

  const timestamp = Date.now()

  const tasks = Array.from({ length: count }, (_, i) => {
    const svc = SERVICES[i % SERVICES.length]
    return createLeadWithAllocation({
      name: NAMES[i % NAMES.length],
      phone: `900000${timestamp.toString().slice(-4)}${i.toString().padStart(2, '0')}`,
      city: CITIES[i % CITIES.length],
      serviceType: svc,
      description: `Bulk test lead #${i + 1} for ${SERVICE_NAMES[svc]}`,
    })
  })

  const results = await Promise.allSettled(tasks)

  const succeeded = results.filter((r) => r.status === 'fulfilled')
  const failed = results.filter((r) => r.status === 'rejected')

  return NextResponse.json({
    total: count,
    succeeded: succeeded.length,
    failed: failed.length,
    errors: failed.map((r) => (r as PromiseRejectedResult).reason?.message),
    leads: succeeded.map((r) => {
      const val = (r as PromiseFulfilledResult<{ lead: { id: number; serviceType: number }; providerIds: number[] }>).value
      return {
        leadId: val.lead.id,
        serviceType: val.lead.serviceType,
        assignedProviders: val.providerIds,
      }
    }),
  })
}
