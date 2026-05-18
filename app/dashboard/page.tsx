'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  LayoutDashboard, Users, TrendingUp, Activity, RefreshCw,
  ChevronDown, ChevronUp, Wifi, WifiOff, Clock
} from 'lucide-react'

const SERVICE_NAMES: Record<number, string> = {
  1: 'Home Shifting',
  2: 'Office Relocation',
  3: 'Vehicle Transport',
}
const SERVICE_COLORS: Record<number, string> = {
  1: '#3b82f6',
  2: '#8b5cf6',
  3: '#10b981',
}

interface Assignment {
  id: number
  assignedAt: string
  lead: {
    id: number; name: string; phone: string; city: string
    serviceType: number; description: string; createdAt: string
  }
}

interface Provider {
  id: number
  name: string
  serviceIds: number[]
  monthlyQuota: number
  leadsThisMonth: number
  remaining: number
  assignments: Assignment[]
}

export default function DashboardPage() {
  const [providers, setProviders] = useState<Provider[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [connected, setConnected] = useState(false)
  const [expanded, setExpanded] = useState<number | null>(null)
  const [totalLeads, setTotalLeads] = useState(0)

  const fetchProviders = useCallback(async () => {
    try {
      const res = await fetch('/api/providers')
      const data: Provider[] = await res.json()
      setProviders(data)
      setTotalLeads(data.reduce((s, p) => s + p.leadsThisMonth, 0))
      setLastUpdated(new Date())
    } catch {
      console.error('Failed to fetch providers')
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial fetch + SSE connection
  useEffect(() => {
    fetchProviders()

    const evtSource = new EventSource('/api/events')
    evtSource.onopen = () => setConnected(true)
    evtSource.onerror = () => setConnected(false)
    evtSource.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data)
        if (msg.type === 'snapshot' || msg.type === 'update') {
          fetchProviders()
        }
      } catch {}
    }

    return () => evtSource.close()
  }, [fetchProviders])

  const getQuotaColor = (remaining: number, quota: number) => {
    const pct = remaining / quota
    if (pct > 0.6) return '#10b981'
    if (pct > 0.3) return '#f59e0b'
    return '#ef4444'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  const assignedToday = providers.reduce((s, p) => s + p.leadsThisMonth, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}
            >
              <LayoutDashboard className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Provider Dashboard</h1>
          </div>
          <p className="text-sm text-gray-400 ml-12">Real-time lead assignment tracking</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Live indicator */}
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
            style={{
              background: connected ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
              border: `1px solid ${connected ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
              color: connected ? '#34d399' : '#f87171',
            }}
          >
            {connected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            <span
              className="w-1.5 h-1.5 rounded-full live-dot"
              style={{ background: connected ? '#34d399' : '#f87171' }}
            />
            {connected ? 'Live' : 'Reconnecting'}
          </div>

          <button
            onClick={fetchProviders}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{ background: '#1f2937', border: '1px solid #374151', color: '#9ca3af' }}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Providers', value: providers.length, icon: Users, color: '#3b82f6' },
          { label: 'Leads This Month', value: assignedToday, icon: TrendingUp, color: '#8b5cf6' },
          { label: 'Active Providers', value: providers.filter(p => p.remaining > 0).length, icon: Activity, color: '#10b981' },
          { label: 'Quota Used', value: `${Math.round((assignedToday / (providers.length * 10)) * 100)}%`, icon: TrendingUp, color: '#f59e0b' },
        ].map((stat) => (
          <div key={stat.label} className="glass p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400 font-medium">{stat.label}</span>
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: `${stat.color}20` }}
              >
                <stat.icon className="w-3.5 h-3.5" style={{ color: stat.color }} />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Last updated */}
      {lastUpdated && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Clock className="w-3 h-3" />
          Last updated: {lastUpdated.toLocaleTimeString()}
          {connected && <span className="text-emerald-500 ml-1">· Auto-refreshing every 3s</span>}
        </div>
      )}

      {/* Provider cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {providers.map((provider) => {
          const usedPct = (provider.leadsThisMonth / provider.monthlyQuota) * 100
          const quotaColor = getQuotaColor(provider.remaining, provider.monthlyQuota)
          const isExpanded = expanded === provider.id

          return (
            <div
              key={provider.id}
              className="glass overflow-hidden"
              style={{ transition: 'all 0.2s ease' }}
            >
              {/* Provider header */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                      style={{ background: `linear-gradient(135deg, ${quotaColor}40, ${quotaColor}20)`, border: `1px solid ${quotaColor}40` }}
                    >
                      {provider.id}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">{provider.name}</div>
                      <div className="flex gap-1 mt-0.5">
                        {provider.serviceIds.map((sid) => (
                          <span
                            key={sid}
                            className="text-xs px-1.5 py-0.5 rounded"
                            style={{ background: `${SERVICE_COLORS[sid]}15`, color: SERVICE_COLORS[sid], fontSize: '0.6rem' }}
                          >
                            S{sid}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div
                    className="text-xs px-2 py-1 rounded-full font-semibold"
                    style={{
                      background: `${quotaColor}15`,
                      color: quotaColor,
                      border: `1px solid ${quotaColor}30`,
                    }}
                  >
                    {provider.remaining} left
                  </div>
                </div>

                {/* Quota bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>{provider.leadsThisMonth} received</span>
                    <span>{provider.monthlyQuota} quota</span>
                  </div>
                  <div
                    className="h-1.5 rounded-full overflow-hidden"
                    style={{ background: '#1f2937' }}
                  >
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(usedPct, 100)}%`,
                        background: `linear-gradient(90deg, ${quotaColor}, ${quotaColor}cc)`,
                      }}
                    />
                  </div>
                </div>

                {/* Expand leads button */}
                {provider.assignments.length > 0 && (
                  <button
                    onClick={() => setExpanded(isExpanded ? null : provider.id)}
                    className="w-full flex items-center justify-between text-xs text-gray-400 hover:text-gray-300 pt-2 transition-colors"
                    style={{ borderTop: '1px solid #1f2937' }}
                  >
                    <span>{provider.assignments.length} lead(s) assigned</span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>

              {/* Expanded leads list */}
              {isExpanded && (
                <div
                  className="px-4 pb-4 space-y-2"
                  style={{ borderTop: '1px solid #1f2937' }}
                >
                  {provider.assignments.map((a) => (
                    <div
                      key={a.id}
                      className="p-2.5 rounded-lg text-xs"
                      style={{ background: '#0a0f1e', border: '1px solid #1f2937' }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-white">#{a.lead.id} {a.lead.name}</span>
                        <span
                          className="px-1.5 py-0.5 rounded text-xs"
                          style={{
                            background: `${SERVICE_COLORS[a.lead.serviceType]}15`,
                            color: SERVICE_COLORS[a.lead.serviceType],
                          }}
                        >
                          {SERVICE_NAMES[a.lead.serviceType]}
                        </span>
                      </div>
                      <div className="text-gray-400">{a.lead.city} · {a.lead.phone}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* All leads table */}
      <div className="glass overflow-hidden">
        <div className="p-4 flex items-center justify-between" style={{ borderBottom: '1px solid #1f2937' }}>
          <h2 className="text-sm font-semibold text-white">Recent Assignments</h2>
          <span className="text-xs text-gray-400">{totalLeads} total this month</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: '#0a0f1e' }}>
                {['Provider', 'Lead #', 'Customer', 'City', 'Service', 'Assigned'].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {providers.flatMap((p) =>
                p.assignments.map((a) => ({
                  ...a,
                  providerName: p.name,
                  providerId: p.id,
                }))
              )
                .sort((a, b) => new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime())
                .slice(0, 30)
                .map((row) => (
                  <tr
                    key={`${row.providerId}-${row.id}`}
                    style={{ borderBottom: '1px solid #111827' }}
                  >
                    <td className="px-4 py-3">
                      <span
                        className="text-xs px-2 py-1 rounded font-medium"
                        style={{ background: 'rgba(59,130,246,0.1)', color: '#93c5fd' }}
                      >
                        {row.providerName}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-300">#{row.lead.id}</td>
                    <td className="px-4 py-3 text-white font-medium">{row.lead.name}</td>
                    <td className="px-4 py-3 text-gray-400">{row.lead.city}</td>
                    <td className="px-4 py-3">
                      <span
                        className="text-xs px-2 py-0.5 rounded"
                        style={{
                          background: `${SERVICE_COLORS[row.lead.serviceType]}15`,
                          color: SERVICE_COLORS[row.lead.serviceType],
                        }}
                      >
                        {SERVICE_NAMES[row.lead.serviceType]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {new Date(row.assignedAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              {providers.every((p) => p.assignments.length === 0) && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    No assignments yet. Submit a service request to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
