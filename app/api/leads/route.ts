import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { getDB } from '@/lib/db'
import { leads, leadAssignments, providers } from '@/lib/schema'
import { createLeadWithAllocation, SERVICE_NAMES } from '@/lib/allocation'

export const runtime = 'edge'

export async function GET() {
  const db = getDB()
  const rows = await db.select().from(leads).orderBy(leads.createdAt)
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as Record<string, unknown>
    const { name, phone, city, serviceType, description } = body

    if (!name || !phone || !city || !serviceType || !description) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }

    const svcNum = Number(serviceType)
    if (![1, 2, 3].includes(svcNum)) {
      return NextResponse.json({ error: 'Invalid service type' }, { status: 400 })
    }

    const db = getDB()
    const { leadId, providerIds } = await createLeadWithAllocation(db, {
      name: String(name).trim(),
      phone: String(phone).trim(),
      city: String(city).trim(),
      serviceType: svcNum,
      description: String(description).trim(),
    })

    return NextResponse.json(
      {
        success: true,
        lead: { id: leadId, serviceType: svcNum, serviceName: SERVICE_NAMES[svcNum] },
        assignedProviders: providerIds,
        message: `Lead #${leadId} assigned to ${providerIds.length} provider(s).`,
      },
      { status: 201 }
    )
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    // SQLite unique constraint violation
    if (msg.includes('UNIQUE constraint failed') || msg.includes('unique')) {
      return NextResponse.json(
        { error: 'A lead for this phone number and service already exists.' },
        { status: 409 }
      )
    }
    if (msg.includes('No providers available')) {
      return NextResponse.json({ error: msg }, { status: 503 })
    }
    console.error('[POST /api/leads]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
