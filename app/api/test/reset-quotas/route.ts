import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST() {
  await prisma.$transaction([
    prisma.provider.updateMany({ data: { leadsThisMonth: 0 } }),
    prisma.allocationState.updateMany({ data: { poolIndex: 0 } }),
  ])

  return NextResponse.json({
    success: true,
    message: 'All provider quotas reset and allocation indices cleared.',
  })
}
