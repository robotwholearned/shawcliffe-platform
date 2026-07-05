'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { TwilioSubaccount } from '@/lib/supabase/types'

interface Props {
  clientId: string
  businessName: string
  subaccount: TwilioSubaccount | null
}

interface AvailableNumber {
  phoneNumber: string
  friendlyName: string
  locality: string | null
  region: string | null
}

const USE_CASE_CATEGORIES = [
  'CUSTOMER_CARE',
  'ACCOUNT_NOTIFICATIONS',
  'DELIVERY_NOTIFICATIONS',
  'MARKETING',
]

const STATUS_LABEL: Record<string, string> = {
  not_started: 'Not started',
  pending_review: 'Pending review',
  in_review: 'In review',
  approved: 'Approved',
  rejected: 'Rejected',
}

const STATUS_CLASS: Record<string, string> = {
  not_started: 'bg-gray-100 text-gray-600',
  pending_review: 'bg-amber-100 text-amber-700',
  in_review: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-600',
}

export default function TollFreeWizard({ clientId, businessName, subaccount }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [numbers, setNumbers] = useState<AvailableNumber[] | null>(null)

  async function post(path: string, body?: unknown) {
    setBusy(true)
    setError(null)
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    })
    const data = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) {
      setError(data.error ?? 'Request failed')
      return null
    }
    return data
  }

  async function createSubaccount() {
    const data = await post(`/api/admin/clients/${clientId}/twilio/subaccount`)
    if (data) router.refresh()
  }

  async function searchNumbers() {
    setBusy(true)
    setError(null)
    const res = await fetch(`/api/admin/clients/${clientId}/twilio/available-numbers`)
    const data = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) { setError(data.error ?? 'Search failed'); return }
    setNumbers(data.numbers ?? [])
  }

  async function buyNumber(phoneNumber: string) {
    if (!confirm(`Buy ${phoneNumber} for ${businessName}? This is a real Twilio purchase and starts recurring billing.`)) return
    const data = await post(`/api/admin/clients/${clientId}/twilio/purchase-number`, { phoneNumber })
    if (data) router.refresh()
  }

  async function refreshStatus() {
    setBusy(true)
    setError(null)
    const res = await fetch(`/api/admin/clients/${clientId}/twilio/verification`)
    const data = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) { setError(data.error ?? 'Refresh failed'); return }
    router.refresh()
  }

  if (error) {
    return (
      <div className="space-y-3">
        <div className="bg-red-50 text-red-700 text-sm rounded-lg p-3">{error}</div>
        <button onClick={() => setError(null)} className="text-sm text-blue-600 hover:underline">Dismiss</button>
      </div>
    )
  }

  // Step 1 — no subaccount yet
  if (!subaccount) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-5 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">Step 1 — Create Twilio Subaccount</h2>
        <p className="text-sm text-gray-500">
          Creates an isolated Twilio subaccount for {businessName}, separate from Shawcliffe's other clients.
        </p>
        <button
          onClick={createSubaccount}
          disabled={busy}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {busy ? 'Creating…' : 'Create Twilio Subaccount'}
        </button>
      </div>
    )
  }

  // Step 2 — subaccount exists, no number yet
  if (!subaccount.phone_number) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-5 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">Step 2 — Buy a Toll-Free Number</h2>
        <p className="text-sm text-gray-500">Subaccount created ({subaccount.account_sid}). Now search Canadian toll-free numbers.</p>
        <button
          onClick={searchNumbers}
          disabled={busy}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {busy ? 'Searching…' : 'Search Available Numbers'}
        </button>
        {numbers && (
          <div className="divide-y divide-gray-50 border border-gray-100 rounded-lg">
            {numbers.length === 0 && <p className="text-sm text-gray-400 p-3">No numbers found.</p>}
            {numbers.map(n => (
              <div key={n.phoneNumber} className="flex items-center justify-between px-3 py-2">
                <div>
                  <p className="text-sm font-mono">{n.phoneNumber}</p>
                  <p className="text-xs text-gray-400">{n.locality ?? n.region ?? 'Canada'}</p>
                </div>
                <button
                  onClick={() => buyNumber(n.phoneNumber)}
                  disabled={busy}
                  className="text-xs bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded-lg hover:bg-green-100 disabled:opacity-50"
                >
                  Buy
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Step 3 — number bought, verification not yet submitted
  if (subaccount.verification_status === 'not_started') {
    return <VerificationForm clientId={clientId} businessName={businessName} phoneNumber={subaccount.phone_number} onSubmitted={() => router.refresh()} />
  }

  // Step 4 — verification submitted, show status
  return (
    <div className="bg-white rounded-xl shadow-sm p-5 space-y-3">
      <h2 className="text-sm font-semibold text-gray-700">Verification Status</h2>
      <div className="flex items-center gap-2">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_CLASS[subaccount.verification_status]}`}>
          {STATUS_LABEL[subaccount.verification_status]}
        </span>
        <span className="text-xs text-gray-400 font-mono">{subaccount.phone_number}</span>
      </div>
      {subaccount.verification_status === 'rejected' && (
        <p className="text-sm text-red-600">
          Rejected. See details in the Twilio Console for this subaccount ({subaccount.account_sid}) and resubmit.
        </p>
      )}
      <button
        onClick={refreshStatus}
        disabled={busy}
        className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-50"
      >
        {busy ? 'Checking…' : 'Refresh Status from Twilio'}
      </button>
    </div>
  )
}

function VerificationForm({
  clientId, businessName, phoneNumber, onSubmitted,
}: { clientId: string; businessName: string; phoneNumber: string; onSubmitted: () => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    businessName,
    businessWebsite: '',
    notificationEmail: '',
    useCaseCategories: [] as string[],
    useCaseSummary: '',
    productionMessageSample: '',
    optInImageUrls: '',
    optInType: 'WEB_FORM',
    messageVolume: '1,000',
    businessStreetAddress: '',
    businessCity: '',
    businessStateProvinceRegion: '',
    businessPostalCode: '',
    businessCountry: 'CA',
  })

  function toggleCategory(cat: string) {
    setForm(f => ({
      ...f,
      useCaseCategories: f.useCaseCategories.includes(cat)
        ? f.useCaseCategories.filter(c => c !== cat)
        : [...f.useCaseCategories, cat],
    }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const res = await fetch(`/api/admin/clients/${clientId}/twilio/verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        optInImageUrls: form.optInImageUrls.split(',').map(s => s.trim()).filter(Boolean),
      }),
    })
    const data = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) { setError(data.error ?? 'Submission failed'); return }
    onSubmitted()
  }

  return (
    <form onSubmit={submit} className="bg-white rounded-xl shadow-sm p-5 space-y-3">
      <h2 className="text-sm font-semibold text-gray-700">Step 3 — Submit Toll-Free Verification</h2>
      <p className="text-sm text-gray-500">For {phoneNumber}. All fields required unless marked optional.</p>

      {error && <div className="bg-red-50 text-red-700 text-sm rounded-lg p-3">{error}</div>}

      <Field label="Business name">
        <input required value={form.businessName} onChange={e => setForm(f => ({ ...f, businessName: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </Field>
      <Field label="Business website">
        <input required type="url" placeholder="https://…" value={form.businessWebsite} onChange={e => setForm(f => ({ ...f, businessWebsite: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </Field>
      <Field label="Notification email">
        <input required type="email" value={form.notificationEmail} onChange={e => setForm(f => ({ ...f, notificationEmail: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </Field>
      <Field label="Use case categories">
        <div className="flex flex-wrap gap-2">
          {USE_CASE_CATEGORIES.map(cat => (
            <button
              type="button"
              key={cat}
              onClick={() => toggleCategory(cat)}
              className={`text-xs px-2.5 py-1 rounded-full border ${form.useCaseCategories.includes(cat) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200'}`}
            >
              {cat.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Use case summary">
        <textarea required rows={3} value={form.useCaseSummary} onChange={e => setForm(f => ({ ...f, useCaseSummary: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </Field>
      <Field label="Sample message">
        <textarea required rows={2} value={form.productionMessageSample} onChange={e => setForm(f => ({ ...f, productionMessageSample: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </Field>
      <Field label="Opt-in image URL(s) — comma separated, must be publicly hosted">
        <input required value={form.optInImageUrls} onChange={e => setForm(f => ({ ...f, optInImageUrls: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </Field>
      <Field label="Opt-in type">
        <select value={form.optInType} onChange={e => setForm(f => ({ ...f, optInType: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="WEB_FORM">Web form</option>
          <option value="VERBAL">Verbal</option>
          <option value="PAPER_FORM">Paper form</option>
          <option value="VIA_TEXT">Via text</option>
          <option value="MOBILE_QR_CODE">Mobile QR code</option>
        </select>
      </Field>
      <Field label="Estimated monthly message volume">
        <select value={form.messageVolume} onChange={e => setForm(f => ({ ...f, messageVolume: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="10">Up to 10</option>
          <option value="100">Up to 100</option>
          <option value="1,000">Up to 1,000</option>
          <option value="10,000">Up to 10,000</option>
          <option value="100,000">Up to 100,000</option>
        </select>
      </Field>
      <Field label="Business address (optional)">
        <input placeholder="Street address" value={form.businessStreetAddress} onChange={e => setForm(f => ({ ...f, businessStreetAddress: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2" />
        <div className="grid grid-cols-2 gap-2">
          <input placeholder="City" value={form.businessCity} onChange={e => setForm(f => ({ ...f, businessCity: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <input placeholder="Province" value={form.businessStateProvinceRegion} onChange={e => setForm(f => ({ ...f, businessStateProvinceRegion: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <input placeholder="Postal code" value={form.businessPostalCode} onChange={e => setForm(f => ({ ...f, businessPostalCode: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <input placeholder="Country" value={form.businessCountry} onChange={e => setForm(f => ({ ...f, businessCountry: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </Field>

      <button
        type="submit"
        disabled={busy || form.useCaseCategories.length === 0}
        className="w-full bg-blue-600 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
      >
        {busy ? 'Submitting…' : 'Submit Verification to Twilio'}
      </button>
    </form>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-gray-500">{label}</span>
      {children}
    </label>
  )
}
