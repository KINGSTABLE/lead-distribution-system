import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * One-time database setup endpoint.
 * Idempotent — safe to call multiple times.
 * Vercel/Railway: call GET /api/setup after first deploy to seed providers.
 */
export async function GET() {
  try {
    // Check if already seeded
    const count = await prisma.provider.count()
    if (count > 0) {
      return NextResponse.json({ status: 'already_seeded', providers: count })
    }

    // Seed providers
    await prisma.provider.createMany({
      data: [
        { id: 1, name: 'Provider 1', serviceIds: [1, 3], monthlyQuota: 10, leadsThisMonth: 0 },
        { id: 2, name: 'Provider 2', serviceIds: [1, 3], monthlyQuota: 10, leadsThisMonth: 0 },
        { id: 3, name: 'Provider 3', serviceIds: [1, 3], monthlyQuota: 10, leadsThisMonth: 0 },
        { id: 4, name: 'Provider 4', serviceIds: [1, 3], monthlyQuota: 10, leadsThisMonth: 0 },
        { id: 5, name: 'Provider 5', serviceIds: [2, 3], monthlyQuota: 10, leadsThisMonth: 0 },
        { id: 6, name: 'Provider 6', serviceIds: [2, 3], monthlyQuota: 10, leadsThisMonth: 0 },
        { id: 7, name: 'Provider 7', serviceIds: [2, 3], monthlyQuota: 10, leadsThisMonth: 0 },
        { id: 8, name: 'Provider 8', serviceIds: [2, 3], monthlyQuota: 10, leadsThisMonth: 0 },
      ],
    })

    // Seed allocation state
    await prisma.allocationState.createMany({
      data: [
        { serviceType: 1, poolIndex: 0 },
        { serviceType: 2, poolIndex: 0 },
        { serviceType: 3, poolIndex: 0 },
      ],
    })

    return NextResponse.json({
      status: 'seeded',
      message: 'Database seeded successfully with 8 providers.',
    })
  } catch (err) {
    console.error('[GET /api/setup]', err)
    return NextResponse.json(
      { error: 'Setup failed', detail: String(err) },
      { status: 500 }
    )
  }
}
