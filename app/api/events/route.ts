import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * Server-Sent Events endpoint for real-time dashboard updates.
 * Polls the DB every 3 s and pushes diffs to connected clients.
 */
export async function GET(req: NextRequest) {
  const encoder = new TextEncoder()
  let closed = false

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        } catch {}
      }

      // Send initial snapshot immediately
      const initial = await getSnapshot()
      send({ type: 'snapshot', ...initial })

      // Poll every 3 seconds
      const interval = setInterval(async () => {
        if (closed) {
          clearInterval(interval)
          return
        }
        try {
          const snapshot = await getSnapshot()
          send({ type: 'update', ...snapshot })
        } catch (err) {
          console.error('[SSE poll]', err)
        }
      }, 3000)

      // Clean up when client disconnects
      req.signal.addEventListener('abort', () => {
        closed = true
        clearInterval(interval)
        controller.close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}

async function getSnapshot() {
  const [providers, recentLeads] = await Promise.all([
    prisma.provider.findMany({
      orderBy: { id: 'asc' },
      select: {
        id: true,
        name: true,
        monthlyQuota: true,
        leadsThisMonth: true,
      },
    }),
    prisma.lead.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        name: true,
        city: true,
        serviceType: true,
        createdAt: true,
      },
    }),
  ])

  return { providers, recentLeads, ts: Date.now() }
}
