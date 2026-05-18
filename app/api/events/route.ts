import { NextRequest } from 'next/server'
import { getDB } from '@/lib/db'
import { providers, leads } from '@/lib/schema'

export const runtime = 'edge'
export const dynamic  = 'force-dynamic'

/**
 * Server-Sent Events stream for real-time dashboard updates.
 * Polls D1 every 3 s and pushes the latest snapshot to connected clients.
 */
export async function GET(req: NextRequest) {
  const encoder = new TextEncoder()
  let closed    = false

  const getSnapshot = async () => {
    const db = getDB()
    const [allProviders, recentLeads] = await Promise.all([
      db.select({
        id:             providers.id,
        name:           providers.name,
        monthlyQuota:   providers.monthlyQuota,
        leadsThisMonth: providers.leadsThisMonth,
      }).from(providers).orderBy(providers.id),
      db.select({
        id:          leads.id,
        name:        leads.name,
        city:        leads.city,
        serviceType: leads.serviceType,
        createdAt:   leads.createdAt,
      }).from(leads).orderBy(leads.createdAt).limit(5),
    ])
    return { providers: allProviders, recentLeads, ts: Date.now() }
  }

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        } catch { /* client disconnected */ }
      }

      send({ type: 'snapshot', ...await getSnapshot() })

      const interval = setInterval(async () => {
        if (closed) { clearInterval(interval); return }
        try { send({ type: 'update', ...await getSnapshot() }) } catch { /* ignore */ }
      }, 3000)

      req.signal.addEventListener('abort', () => {
        closed = true
        clearInterval(interval)
        try { controller.close() } catch { /* already closed */ }
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection':    'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
