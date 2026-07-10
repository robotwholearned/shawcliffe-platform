'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useEnabledComponents } from '@/lib/use-enabled-components'

const STATUSES = ['new', 'contacted', 'quoted', 'won', 'lost'] as const
type Status = (typeof STATUSES)[number]

interface Inquiry {
  id: string
  service_category: string | null
  job_location: string | null
  urgency: string | null
  description: string | null
  photo_urls: string[]
  preferred_contact_method: string | null
  status: Status
  created_at: string
  customer: { name: string; phone: string | null; email: string | null } | null
  vehicle: { make: string | null; model: string | null; year: number | null; vin: string | null; plate: string | null; mileage: number | null } | null
  property: {
    address: string | null; gate_code: string | null; parking_instructions: string | null; pets_on_site: string | null
    access_notes: string | null; preferred_service_day: string | null; lawn_size: string | null
    snow_removal_areas: string | null; cleaning_instructions: string | null; safety_notes: string | null
  } | null
}

export default function InquiriesPage() {
  const { has, loading: gateLoading } = useEnabledComponents()
  const [inquiries, setInquiries] = useState<Inquiry[] | null>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [status, setStatus] = useState('')
  const [updating, setUpdating] = useState<string | null>(null)
  const pageSize = 25

  useEffect(() => {
    if (gateLoading || !has('inquiry_quote_form')) return
    const controller = new AbortController()
    setInquiries(null)
    const params = new URLSearchParams({ page: String(page) })
    if (status) params.set('status', status)
    fetch(`/api/seller/inquiries?${params}`, { signal: controller.signal })
      .then(r => (r.ok ? r.json() : { inquiries: [], total: 0 }))
      .then(d => { setInquiries(d.inquiries ?? []); setTotal(d.total ?? 0) })
      .catch(() => {})
    return () => controller.abort()
  }, [gateLoading, has, page, status])

  async function updateStatus(id: string, newStatus: Status) {
    setUpdating(id)
    const res = await fetch(`/api/seller/inquiries/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    if (res.ok) {
      setInquiries(prev => prev?.map(i => (i.id === id ? { ...i, status: newStatus } : i)) ?? null)
    }
    setUpdating(null)
  }

  if (gateLoading) {
    return <div className="flex items-center justify-center min-h-screen"><p className="text-sm text-gray-400">Loading…</p></div>
  }

  if (!has('inquiry_quote_form')) {
    return (
      <div className="flex items-center justify-center min-h-screen px-6">
        <p className="text-sm text-gray-400 text-center">Inquiry / Quote Form isn't enabled for your account.</p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4 pb-24">
      <header className="flex items-center gap-3 pt-2">
        <Link href="/seller" className="text-sm text-blue-600 hover:text-blue-700">← Back</Link>
        <h1 className="text-lg font-bold text-gray-900">Inquiries</h1>
      </header>

      <select
        value={status}
        onChange={e => { setPage(0); setStatus(e.target.value) }}
        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">All statuses</option>
        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
      </select>

      <section className="bg-white rounded-2xl shadow-sm divide-y divide-gray-50">
        {inquiries === null && <p className="text-sm text-gray-400 py-8 text-center">Loading…</p>}
        {inquiries?.length === 0 && <p className="text-sm text-gray-400 py-8 text-center">No inquiries found.</p>}
        {inquiries?.map(i => (
          <div key={i.id} className="px-4 py-3 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-gray-800 truncate">
                {i.service_category || 'General inquiry'}
              </span>
              <span className="text-xs text-gray-400 flex-shrink-0">
                {new Date(i.created_at).toLocaleDateString()}
              </span>
            </div>
            {i.customer && (
              <div className="text-xs text-gray-500 flex flex-wrap gap-x-3">
                <span>{i.customer.name}</span>
                {i.customer.phone && <span>{i.customer.phone}</span>}
                {i.customer.email && <span>{i.customer.email}</span>}
              </div>
            )}
            {i.job_location && <div className="text-xs text-gray-500">{i.job_location}</div>}
            {i.vehicle && (
              <div className="text-xs text-gray-500">
                🚗 {[i.vehicle.year, i.vehicle.make, i.vehicle.model].filter(Boolean).join(' ')}
                {i.vehicle.plate && ` · Plate ${i.vehicle.plate}`}
                {i.vehicle.vin && ` · VIN ${i.vehicle.vin}`}
                {i.vehicle.mileage != null && ` · ${i.vehicle.mileage.toLocaleString()} mi`}
              </div>
            )}
            {i.property && (
              <div className="text-xs text-gray-500 space-y-0.5">
                <div>🏠 {i.property.address || 'Property on file'}</div>
                {i.property.gate_code && <div>Gate code: {i.property.gate_code}</div>}
                {i.property.parking_instructions && <div>Parking: {i.property.parking_instructions}</div>}
                {i.property.access_notes && <div>Access: {i.property.access_notes}</div>}
                {i.property.pets_on_site && <div>Pets on site: {i.property.pets_on_site}</div>}
                {i.property.preferred_service_day && <div>Preferred day: {i.property.preferred_service_day}</div>}
                {i.property.lawn_size && <div>Lawn size: {i.property.lawn_size}</div>}
                {i.property.snow_removal_areas && <div>Snow removal: {i.property.snow_removal_areas}</div>}
                {i.property.cleaning_instructions && <div>Cleaning: {i.property.cleaning_instructions}</div>}
                {i.property.safety_notes && <div>Safety: {i.property.safety_notes}</div>}
              </div>
            )}
            {i.description && <p className="text-sm text-gray-700">{i.description}</p>}
            <div className="flex flex-wrap gap-1.5 text-xs text-gray-400">
              {i.urgency && <span className="px-1.5 py-0.5 bg-gray-100 rounded-full">{i.urgency}</span>}
              {i.preferred_contact_method && (
                <span className="px-1.5 py-0.5 bg-gray-100 rounded-full">prefers {i.preferred_contact_method}</span>
              )}
            </div>
            {i.photo_urls.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {i.photo_urls.map((url, idx) => (
                  <a key={url} href={url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:text-blue-700">
                    Photo {idx + 1}
                  </a>
                ))}
              </div>
            )}
            <select
              value={i.status}
              disabled={updating === i.id}
              onChange={e => updateStatus(i.id, e.target.value as Status)}
              className="mt-1 border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        ))}
      </section>

      {total > pageSize && (
        <div className="flex items-center justify-between text-sm">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="text-blue-600 disabled:text-gray-300"
          >
            ← Prev
          </button>
          <span className="text-xs text-gray-400">
            {page * pageSize + 1}–{Math.min((page + 1) * pageSize, total)} of {total}
          </span>
          <button
            onClick={() => setPage(p => ((p + 1) * pageSize < total ? p + 1 : p))}
            disabled={(page + 1) * pageSize >= total}
            className="text-blue-600 disabled:text-gray-300"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}
