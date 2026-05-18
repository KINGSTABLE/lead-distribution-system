'use client'

import { useState } from 'react'
import { CheckCircle, AlertCircle, Loader2, Send, MapPin, Phone, User, FileText, Layers } from 'lucide-react'

const SERVICE_OPTIONS = [
  { value: 1, label: 'Home Shifting', desc: 'Residential relocation services' },
  { value: 2, label: 'Office Relocation', desc: 'Commercial & office moves' },
  { value: 3, label: 'Vehicle Transport', desc: 'Car & bike transportation' },
]

interface AssignmentResult {
  lead: { id: number; name: string; serviceName: string; city: string }
  assignedProviders: number[]
  message: string
}

export default function RequestServicePage() {
  const [form, setForm] = useState({
    name: '', phone: '', city: '', serviceType: '', description: '',
  })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AssignmentResult | null>(null)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setResult(null)
    setError('')

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, serviceType: Number(form.serviceType) }),
      })
      const data = await res.json() as { error?: string } & AssignmentResult

      if (!res.ok) {
        setError((data as { error?: string }).error || 'Something went wrong')
        return
      }

      setResult(data as AssignmentResult)
      setForm({ name: '', phone: '', city: '', serviceType: '', description: '' })
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const inputClass =
    'w-full px-4 py-3 rounded-xl text-white placeholder-gray-500 text-sm transition-all'
  const inputStyle = {
    background: '#1f2937',
    border: '1px solid #374151',
    outline: 'none',
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}
          >
            <Send className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Request a Service</h1>
            <p className="text-sm text-gray-400">Get matched with verified providers instantly</p>
          </div>
        </div>
      </div>

      {/* Success card */}
      {result && (
        <div
          className="mb-6 p-5 rounded-xl border animate-fade-in"
          style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)' }}
        >
          <div className="flex items-start gap-3">
            <CheckCircle className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-emerald-400">Lead #{result.lead.id} Created!</p>
              <p className="text-sm text-gray-300 mt-1">{result.message}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {result.assignedProviders.map((pid) => (
                  <span
                    key={pid}
                    className="text-xs px-2.5 py-1 rounded-full font-medium"
                    style={{ background: 'rgba(59,130,246,0.15)', color: '#93c5fd', border: '1px solid rgba(59,130,246,0.3)' }}
                  >
                    Provider {pid}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error card */}
      {error && (
        <div
          className="mb-6 p-4 rounded-xl flex items-start gap-3"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)' }}
        >
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Form */}
      <div className="glass p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name + Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                <User className="w-3.5 h-3.5" /> Full Name
              </label>
              <input
                className={inputClass}
                style={inputStyle}
                placeholder="Rahul Sharma"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                <Phone className="w-3.5 h-3.5" /> Phone Number
              </label>
              <input
                className={inputClass}
                style={inputStyle}
                placeholder="9876543210"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                required
                pattern="[0-9]{10}"
                title="Enter a 10-digit phone number"
              />
            </div>
          </div>

          {/* City */}
          <div>
            <label className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              <MapPin className="w-3.5 h-3.5" /> City
            </label>
            <input
              className={inputClass}
              style={inputStyle}
              placeholder="Mumbai"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              required
            />
          </div>

          {/* Service Type */}
          <div>
            <label className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              <Layers className="w-3.5 h-3.5" /> Service Type
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {SERVICE_OPTIONS.map((svc) => (
                <button
                  key={svc.value}
                  type="button"
                  onClick={() => setForm({ ...form, serviceType: String(svc.value) })}
                  className="p-3 rounded-xl text-left transition-all"
                  style={{
                    background: form.serviceType === String(svc.value)
                      ? 'rgba(59,130,246,0.15)'
                      : '#1f2937',
                    border: form.serviceType === String(svc.value)
                      ? '1px solid rgba(59,130,246,0.5)'
                      : '1px solid #374151',
                  }}
                >
                  <div className="text-sm font-semibold text-white">{svc.label}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{svc.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              <FileText className="w-3.5 h-3.5" /> Description
            </label>
            <textarea
              className={inputClass}
              style={{ ...inputStyle, resize: 'none' }}
              placeholder="Brief description of your requirements..."
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || !form.serviceType}
            className="w-full py-3.5 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all"
            style={{
              background: loading || !form.serviceType
                ? '#374151'
                : 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              cursor: loading || !form.serviceType ? 'not-allowed' : 'pointer',
              opacity: loading || !form.serviceType ? 0.7 : 1,
            }}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Matching providers...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Submit Request
              </>
            )}
          </button>
        </form>
      </div>

      {/* Info panel */}
      <div
        className="mt-6 p-4 rounded-xl text-sm text-gray-400"
        style={{ background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.15)' }}
      >
        <p className="font-medium text-blue-400 mb-1">How it works</p>
        <p>
          Your request is automatically distributed to the best-matched providers using our fair-allocation
          engine. Each lead is assigned to exactly 3 providers, ensuring equal distribution over time.
        </p>
      </div>
    </div>
  )
}
