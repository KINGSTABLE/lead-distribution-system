import { NextRequest, NextResponse } from 'next/server'
import { createLeadWithAllocation, SERVICE_NAMES } from '@/lib/allocation'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'

export async function GET() {
  const leads = await prisma.lead.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      assignments: {
        include: { provider: { select: { id: true, name: true } } },
      },
    },
  })
  return NextResponse.json(leads)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, phone, city, serviceType, description } = body

    if (!name || !phone || !city || !serviceType || !description) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }

    const svcNum = Number(serviceType)
    if (![1, 2, 3].includes(svcNum)) {
      return NextResponse.json({ error: 'Invalid service type' }, { status: 400 })
    }

    const { lead, providerIds } = await createLeadWithAllocation({
      name: String(name).trim(),
      phone: String(phone).trim(),
      city: String(city).trim(),
      serviceType: svcNum,
      description: String(description).trim(),
    })

    return NextResponse.json(
      {
        success: true,
        lead: {
          id: lead.id,
          name: lead.name,
          phone: lead.phone,
          city: lead.city,
          serviceType: lead.serviceType,
          serviceName: SERVICE_NAMES[lead.serviceType],
          description: lead.description,
          createdAt: lead.createdAt,
        },
        assignedProviders: providerIds,
        message: `Lead created and assigned to ${providerIds.length} provider(s).`,
      },
      { status: 201 }
    )
  } catch (err: unknown) {
    // Unique constraint violation = duplicate lead
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return NextResponse.json(
        { error: 'A lead for this phone number and service already exists.' },
        { status: 409 }
      )
    }
    if (err instanceof Error && err.message.includes('No providers available')) {
      return NextResponse.json({ error: err.message }, { status: 503 })
    }
    console.error('[POST /api/leads]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
