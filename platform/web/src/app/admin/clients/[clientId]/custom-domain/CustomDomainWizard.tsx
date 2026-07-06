'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ClientBranding } from '@/lib/supabase/types'

interface Props {
  clientId: string
  branding: ClientBranding | null
}

const STATUS_LABEL: Record<string, string> = {
  not_started: 'Not started',
  pending: 'Pending verification',
  active: 'Active',
  error: 'Error',
}

const STATUS_CLASS: Record<string, string> = {
  not_started: 'bg-gray-100 text-gray-600',
  pending: 'bg-amber-100 text-amber-700',
  active: 'bg-green-100 text-green-700',
  error: 'bg-red-100 text-red-600',
}

export default function CustomDomainWizard({ clientId, branding }: Props) {
  const router = useRouter()
  const [domain, setDomain] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submitDomain(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const res = await fetch(`/api/admin/clients/${clientId}/custom-domain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain }),
    })
    const data = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) { setError(data.error ?? 'Request failed'); return }
    router.refresh()
  }

  async function refresh() {
    setBusy(true)
    setError(null)
    const res = await fetch(`/api/admin/clients/${clientId}/custom-domain`)
    const data = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) { setError(data.error ?? 'Refresh failed'); return }
    router.refresh()
  }

  async function remove() {
    if (!confirm(`Remove custom domain ${branding?.custom_domain}? The client stays reachable at their shawcliffedigital.com subdomain.`)) return
    setBusy(true)
    setError(null)
    const res = await fetch(`/api/admin/clients/${clientId}/custom-domain`, { method: 'DELETE' })
    const data = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) { setError(data.error ?? 'Remove failed'); return }
    router.refresh()
  }

  if (!branding?.custom_domain) {
    return (
      <form onSubmit={submitDomain} className="bg-white rounded-xl shadow-sm p-5 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">Add a Custom Domain</h2>
        {error && <div className="bg-red-50 text-red-700 text-sm rounded-lg p-3">{error}</div>}
        <input
          required
          value={domain}
          onChange={e => setDomain(e.target.value)}
          placeholder="tomsproduce.com"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-400">
          The client points this domain at Shawcliffe's infrastructure via the DNS record shown after you submit.
        </p>
        <button
          type="submit"
          disabled={busy || !domain.trim()}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {busy ? 'Submitting…' : 'Add Domain'}
        </button>
      </form>
    )
  }

  const detail = (branding.custom_domain_verification ?? {}) as any

  return (
    <div className="bg-white rounded-xl shadow-sm p-5 space-y-4">
      {error && <div className="bg-red-50 text-red-700 text-sm rounded-lg p-3">{error}</div>}

      <div className="flex items-center gap-2">
        <span className="font-mono text-sm">{branding.custom_domain}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_CLASS[branding.custom_domain_status]}`}>
          {STATUS_LABEL[branding.custom_domain_status]}
        </span>
      </div>

      {branding.custom_domain_status !== 'active' && (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">DNS Setup Needed</h3>

          {detail.ownership_verification && (
            <div className="bg-gray-50 rounded-lg p-3 text-xs font-mono space-y-1">
              <p className="text-gray-400 font-sans mb-1">Ownership verification (TXT record)</p>
              <p>Name: {detail.ownership_verification.name}</p>
              <p>Value: {detail.ownership_verification.value}</p>
            </div>
          )}

          {Array.isArray(detail.ssl?.validation_records) && detail.ssl.validation_records.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-3 text-xs font-mono space-y-2">
              <p className="text-gray-400 font-sans mb-1">SSL validation record(s)</p>
              {detail.ssl.validation_records.map((rec: Record<string, unknown>, i: number) => (
                <pre key={i} className="whitespace-pre-wrap">{JSON.stringify(rec, null, 2)}</pre>
              ))}
            </div>
          )}

          <p className="text-xs text-gray-500">
            Also point <span className="font-mono">{branding.custom_domain}</span> at Shawcliffe's fallback origin via CNAME (one-time zone setup — see admin docs).
          </p>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={refresh}
          disabled={busy}
          className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-50"
        >
          {busy ? 'Checking…' : 'Refresh Status'}
        </button>
        <button
          onClick={remove}
          disabled={busy}
          className="bg-red-50 text-red-700 border border-red-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-100 disabled:opacity-50"
        >
          Remove Domain
        </button>
      </div>
    </div>
  )
}
