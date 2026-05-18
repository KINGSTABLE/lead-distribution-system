import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { getDB } from '@/lib/db'
import { webhookEvents, leads, leadAssignments, providers } from '@/lib/schema'

export const runtime = 'edge'

/**
 * Idempotent webhook receiver.
 *
 * Each call must include a unique `event_id`. The ID is stored in the
 * webhook_events table which has a PRIMARY KEY (UNIQUE) on `id`.
 * Duplicate event IDs cause a SQLite constraint error, caught here and
 * returned as { status: "already_processed" } with HTTP 200.
 */
export async function POST(req: NextRequest) {
  let body: { event_id?: string; event_type?: string; payload?: Record<string, unknown> } = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { event_id, event_type, payload } = body

  if (!event_id || typeof event_id !== 'string') {
    return NextResponse.json({ error: 'event_id is required' }, { status: 400 })
  }
  if (!event_type || typeof event_type !== 'string') {
    return NextResponse.json({ error: 'event_type is required' }, { status: 400 })
  }

  const db = getDB()

  try {
    // Insert first — unique constraint rejects duplicates
    await db.insert(webhookEvents).values({
      id:          event_id,
      payload:     JSON.stringify({ event_type, ...(payload ?? {}) }),
      status:      'processed',
      processedAt: new Date(),
    })

    // Process the event
    let result: Record<string, unknown> = {}
    if (event_type === 'lead.created' && payload?.lead_id) {
      const [lead] = await db
        .select()
        .from(leads)
        .where(eq(leads.id, Number(payload.lead_id)))
      result = { lead: lead ?? null }
    }

    return NextResponse.json({ success: true, event_id, event_type, status: 'processed', result })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('UNIQUE constraint failed') || msg.includes('unique')) {
      return NextResponse.json({
        success:  true,
        event_id: body.event_id,
        status:   'already_processed',
        message:  'Duplicate event — skipped.',
      })
    }
    console.error('[POST /api/webhooks]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET() {
  const db = getDB()
  const events = await db
    .select()
    .from(webhookEvents)
    .orderBy(webhookEvents.processedAt)
  return NextResponse.json(events)
}
