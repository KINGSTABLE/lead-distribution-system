'use client'

import { useState } from 'react'
import {
  Wrench, RotateCcw, Zap, Webhook, CheckCircle,
  AlertCircle, Loader2, Copy, ChevronRight
} from 'lucide-react'

interface BulkResult {
  total: number; succeeded: number; failed: number
  errors: string[]
  leads: { leadId: number; serviceType: number; assignedProviders: number[] }[]
}

interface WebhookResult {
  success: boolean; event_id: string; status: string; message?: string
}

export default function TestToolsPage() {
  // Reset quotas
  const [resetting, setResetting] = useState(false)
  const [resetDone, setResetDone] = useState(false)

  // Bulk leads
  const [bulking, setBulking] = useState(false)
  const [bulkCount, setBulkCount] = useState(10)
  const [bulkResult, setBulkResult] = useState<BulkResult | null>(null)

  // Webhooks
  const [webhookLoading, setWebhookLoading] = useState(false)
  const [eventId, setEventId] = useState(`evt_${Date.now()}`)
  const [webhookPayload, setWebhookPayload] = useState(
    JSON.stringify({ lead_id: 1 }, null, 2)
  )
  const [webhookResults, setWebhookResults] = useState<WebhookResult[]>([])

  const handleResetQuotas = async () => {
    setResetting(true)
    setResetDone(false)
    const res = await fetch('/api/test/reset-quotas', { method: 'POST' })
    if (res.ok) setResetDone(true)
    setResetting(false)
  }

  const handleBulkLeads = async () => {
    setBulking(true)
    setBulkResult(null)
    const res = await fetch('/api/test/bulk-leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ count: bulkCount }),
    })
    const data = await res.json()
    setBulkResult(data)
    setBulking(false)
  }

  const handleWebhook = async (useNewId = false) => {
    setWebhookLoading(true)
    const id = useNewId ? `evt_${Date.now()}` : eventId
    if (useNewId) setEventId(id)

    let parsedPayload = {}
    try { parsedPayload = JSON.parse(webhookPayload) } catch {}

    const res = await fetch('/api/webhooks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id: id, event_type: 'lead.created', payload: parsedPayload }),
    })
    const data = await res.json()
    setWebhookResults((prev) => [data, ...prev].slice(0, 5))
    setWebhookLoading(false)
  }

  const sectionStyle = 'glass p-5 space-y-4'
  const btnStyle = (color: string, disabled = false) => ({
    background: disabled ? '#374151' : `linear-gradient(135deg, ${color})`,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
  })

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}
        >
          <Wrench className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Test Tools</h1>
          <p className="text-sm text-gray-400">Validate allocation logic, concurrency, and webhook idempotency</p>
        </div>
      </div>

      {/* ── Reset Quotas ─────────────────────────────────────────────────── */}
      <div className={sectionStyle}>
        <div className="flex items-center gap-2">
          <RotateCcw className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-semibold text-white">Reset Provider Quotas</h2>
        </div>
        <p className="text-sm text-gray-400">
          Resets all providers&apos; monthly lead count to 0 and clears the round-robin allocation
          indices. Use before testing allocation logic from scratch.
        </p>
        {resetDone && (
          <div
            className="flex items-center gap-2 p-3 rounded-lg text-sm"
            style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399' }}
          >
            <CheckCircle className="w-4 h-4" />
            All quotas reset successfully. Round-robin indices cleared.
          </div>
        )}
        <button
          onClick={handleResetQuotas}
          disabled={resetting}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
          style={btnStyle('#f59e0b, #ef4444', resetting)}
        >
          {resetting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
          {resetting ? 'Resetting...' : 'Reset All Quotas'}
        </button>
      </div>

      {/* ── Bulk Lead Generation ──────────────────────────────────────────── */}
      <div className={sectionStyle}>
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-blue-400" />
          <h2 className="text-sm font-semibold text-white">Concurrent Lead Generation</h2>
        </div>
        <p className="text-sm text-gray-400">
          Fires N leads simultaneously using <code className="text-blue-400">Promise.allSettled</code>.
          Tests that the serializable transaction isolation prevents duplicate provider assignments
          and quota over-commitment under concurrency.
        </p>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-400">Count:</label>
            <input
              type="number"
              min={1}
              max={20}
              value={bulkCount}
              onChange={(e) => setBulkCount(Number(e.target.value))}
              className="w-20 px-3 py-1.5 rounded-lg text-white text-sm"
              style={{ background: '#1f2937', border: '1px solid #374151' }}
            />
          </div>
          <button
            onClick={handleBulkLeads}
            disabled={bulking}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
            style={btnStyle('#3b82f6, #8b5cf6', bulking)}
          >
            {bulking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            {bulking ? `Firing ${bulkCount} leads...` : `Fire ${bulkCount} Concurrent Leads`}
          </button>
        </div>

        {bulkResult && (
          <div className="space-y-3 animate-fade-in">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Total Fired', value: bulkResult.total, color: '#9ca3af' },
                { label: 'Succeeded', value: bulkResult.succeeded, color: '#10b981' },
                { label: 'Failed', value: bulkResult.failed, color: bulkResult.failed > 0 ? '#ef4444' : '#374151' },
              ].map((s) => (
                <div
                  key={s.label}
                  className="p-3 rounded-lg text-center"
                  style={{ background: '#0a0f1e', border: '1px solid #1f2937' }}
                >
                  <div className="text-xl font-bold" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-xs text-gray-400">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Error list */}
            {bulkResult.errors.length > 0 && (
              <div
                className="p-3 rounded-lg text-xs text-red-300 space-y-1"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
              >
                {bulkResult.errors.map((e, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <AlertCircle className="w-3 h-3 flex-shrink-0" />
                    {e}
                  </div>
                ))}
              </div>
            )}

            {/* Assignments */}
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {bulkResult.leads.map((l) => (
                <div
                  key={l.leadId}
                  className="flex items-center justify-between px-3 py-2 rounded-lg text-xs"
                  style={{ background: '#0a0f1e', border: '1px solid #1f2937' }}
                >
                  <span className="text-gray-300">Lead #{l.leadId} · Service {l.serviceType}</span>
                  <div className="flex gap-1">
                    {l.assignedProviders.map((pid) => (
                      <span
                        key={pid}
                        className="px-1.5 py-0.5 rounded text-xs"
                        style={{ background: 'rgba(59,130,246,0.15)', color: '#93c5fd' }}
                      >
                        P{pid}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Webhook Idempotency ───────────────────────────────────────────── */}
      <div className={sectionStyle}>
        <div className="flex items-center gap-2">
          <Webhook className="w-4 h-4 text-purple-400" />
          <h2 className="text-sm font-semibold text-white">Webhook Idempotency Test</h2>
        </div>
        <p className="text-sm text-gray-400">
          Send the same <code className="text-purple-400">event_id</code> multiple times — subsequent
          calls return <code className="text-purple-400">already_processed</code> without re-executing.
          DB enforces this via a UNIQUE constraint on the event ID.
        </p>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-400 block mb-1.5">Event ID</label>
            <div className="flex gap-2">
              <input
                value={eventId}
                onChange={(e) => setEventId(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg text-white text-sm"
                style={{ background: '#1f2937', border: '1px solid #374151', fontFamily: 'monospace' }}
              />
              <button
                onClick={() => navigator.clipboard.writeText(eventId)}
                className="px-3 py-2 rounded-lg text-gray-400 hover:text-white transition-colors"
                style={{ background: '#1f2937', border: '1px solid #374151' }}
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1.5">Payload (JSON)</label>
            <textarea
              value={webhookPayload}
              onChange={(e) => setWebhookPayload(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-lg text-white text-sm"
              style={{ background: '#1f2937', border: '1px solid #374151', fontFamily: 'monospace', resize: 'none' }}
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => handleWebhook(false)}
              disabled={webhookLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all"
              style={btnStyle('#8b5cf6, #ec4899', webhookLoading)}
            >
              {webhookLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ChevronRight className="w-3.5 h-3.5" />}
              Send Same Event (Test Idempotency)
            </button>
            <button
              onClick={() => handleWebhook(true)}
              disabled={webhookLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white transition-all"
              style={{ background: '#1f2937', border: '1px solid #374151', cursor: webhookLoading ? 'not-allowed' : 'pointer' }}
            >
              New Event ID + Send
            </button>
          </div>
        </div>

        {/* Results */}
        {webhookResults.length > 0 && (
          <div className="space-y-2 animate-fade-in">
            <div className="text-xs text-gray-400 font-medium">Recent Responses (newest first)</div>
            {webhookResults.map((r, i) => (
              <div
                key={i}
                className="p-3 rounded-lg text-xs font-mono"
                style={{
                  background: '#0a0f1e',
                  border: `1px solid ${r.status === 'already_processed' ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.3)'}`,
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  {r.status === 'already_processed'
                    ? <AlertCircle className="w-3 h-3 text-amber-400" />
                    : <CheckCircle className="w-3 h-3 text-emerald-400" />}
                  <span
                    className="font-semibold"
                    style={{ color: r.status === 'already_processed' ? '#f59e0b' : '#34d399' }}
                  >
                    {r.status}
                  </span>
                  <span className="text-gray-500">{r.event_id}</span>
                </div>
                {r.message && <div className="text-gray-400 ml-5">{r.message}</div>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Algorithm explanation */}
      <div
        className="p-5 rounded-xl text-sm"
        style={{ background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.2)' }}
      >
        <div className="text-purple-400 font-semibold mb-2">Allocation Algorithm</div>
        <div className="text-gray-400 space-y-1.5 text-xs leading-relaxed">
          <p><span className="text-white">Service 1</span> → Provider 1 (mandatory) + 2 from pool [2, 3, 4] via round-robin</p>
          <p><span className="text-white">Service 2</span> → Provider 5 (mandatory) + 2 from pool [6, 7, 8] via round-robin</p>
          <p><span className="text-white">Service 3</span> → Providers 1 &amp; 4 (mandatory) + 1 from pool [2, 3, 5, 6, 7, 8] via round-robin</p>
          <p className="text-gray-500 mt-2">
            The round-robin <code>pool_index</code> per service is persisted in the database and locked with
            <code> SELECT FOR UPDATE</code> inside a <code>SERIALIZABLE</code> transaction, guaranteeing
            no race conditions under concurrent requests.
          </p>
        </div>
      </div>
    </div>
  )
}
