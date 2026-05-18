import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'

/**
 * Webhook endpoint with idempotency guarantee.
 *
 * Callers MUST supply a unique `event_id` in the request body.
 * Duplicate event_ids are detected via a UNIQUE constraint on
 * webhook_events.id and return 200 without re-processing.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { event_id, event_type, payload } = body

    if (!event_id || typeof event_id !== 'string') {
      return NextResponse.json({ error: 'event_id is required' }, { status: 400 })
    }

    if (!event_type || typeof event_type !== 'string') {
      return NextResponse.json({ error: 'event_type is required' }, { status: 400 })
    }

    // Attempt to insert the event — unique constraint prevents duplicates
    await prisma.webhookEvent.create({
      data: {
        id: event_id,
        payload: { event_type, ...(payload ?? {}) } as Prisma.InputJsonValue,
        status: 'processed',
      },
    })

    // ── Process the event ────────────────────────────────────────────────────
    let result: Record<string, unknown> = {}

    if (event_type === 'lead.created') {
      const leadId = payload?.lead_id
      if (leadId) {
        const lead = await prisma.lead.findUnique({
          where: { id: Number(leadId) },
          include: { assignments: { include: { provider: true } } },
        })
        result = { lead }
      }
    }

    return NextResponse.json({
      success: true,
      event_id,
      event_type,
      status: 'processed',
      result,
    })
  } catch (err: unknown) {
    // Unique constraint violation = duplicate event_id → idempotent 200
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      const body = await req.json().catch(() => ({}))
      return NextResponse.json({
        success: true,
        event_id: body?.event_id,
        status: 'already_processed',
        message: 'Duplicate event — skipped.',
      })
    }
    console.error('[POST /api/webhooks]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET() {
  const events = await prisma.webhookEvent.findMany({
    orderBy: { processedAt: 'desc' },
    take: 50,
  })
  return NextResponse.json(events)
}
