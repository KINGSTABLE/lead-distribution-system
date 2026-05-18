import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  const providers = await prisma.provider.findMany({
    orderBy: { id: 'asc' },
    include: {
      assignments: {
        orderBy: { assignedAt: 'desc' },
        include: {
          lead: {
            select: {
              id: true,
              name: true,
              phone: true,
              city: true,
              serviceType: true,
              description: true,
              createdAt: true,
            },
          },
        },
      },
    },
  })

  return NextResponse.json(
    providers.map((p) => ({
      id: p.id,
      name: p.name,
      serviceIds: p.serviceIds,
      monthlyQuota: p.monthlyQuota,
      leadsThisMonth: p.leadsThisMonth,
      remaining: p.monthlyQuota - p.leadsThisMonth,
      assignments: p.assignments,
    }))
  )
}
