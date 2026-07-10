'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useEnabledComponents } from '@/lib/use-enabled-components'

const STATUSES = ['requested', 'confirmed', 'declined', 'completed', 'cancelled'] as const
type Status = (typeof STATUSES)[number]

interface Booking {
  id: string
  service: string | null
  requested_date: string | null
  requested_time: string | null
  notes: string | null
  status: Status
  created_at: string
  customer: { name: string; phone: string | null; email: string | null } | null
  pet: { name: string | null; breed: string | null; size: string | null; age: string | null; allergies: string | null; behavior_notes: string | null } | null
}

export default function BookingsPage() {
  const { has, loading: gateLoading } = useEnabledComponents()
  const [bookings, setBookings] = useState<Booking[] | null>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [status, setStatus] = useState('')
  const [updating, setUpdating] = useState<string | null>(null)
  const pageSize = 25

  useEffect(() => {
    if (gateLoading || !has('booking_request_system')) return
    const controller = new AbortController()
    setBookings(null)
    const params = new URLSearchParams({ page: String(page) })
    if (status) params.set('status', status)
    fetch(`/api/seller/bookings?${params}`, { signal: controller.signal })
      .then(r => (r.ok ? r.json() : { bookings: [], total: 0 }))
      .then(d => { setBookings(d.bookings ?? []); setTotal(d.total ?? 0) })
      .catch(() => {})
    return () => controller.abort()
  }, [gateLoading, has, page, status])

  async function updateStatus(id: string, newStatus: Status) {
    setUpdating(id)
    const res = await fetch(`/api/seller/bookings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    if (res.ok) {
      setBookings(prev => prev?.map(b => (b.id === id ? { ...b, status: newStatus } : b)) ?? null)
    }
    setUpdating(null)
  }

  if (gateLoading) {
    return <div className="flex items-center justify-center min-h-screen"><p className="text-sm text-gray-400">Loading…</p></div>
  }

  if (!has('booking_request_system')) {
    return (
      <div className="flex items-center justify-center min-h-screen px-6">
        <p className="text-sm text-gray-400 text-center">Booking Request System isn't enabled for your account.</p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4 pb-24">
      <header className="flex items-center gap-3 pt-2">
        <Link href="/seller" className="text-sm text-blue-600 hover:text-blue-700">← Back</Link>
        <h1 className="text-lg font-bold text-gray-900">Bookings</h1>
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
        {bookings === null && <p className="text-sm text-gray-400 py-8 text-center">Loading…</p>}
        {bookings?.length === 0 && <p className="text-sm text-gray-400 py-8 text-center">No booking requests found.</p>}
        {bookings?.map(b => (
          <div key={b.id} className="px-4 py-3 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-gray-800 truncate">
                {b.service || 'General booking request'}
              </span>
              <span className="text-xs text-gray-400 flex-shrink-0">
                {new Date(b.created_at).toLocaleDateString()}
              </span>
            </div>
            {b.customer && (
              <div className="text-xs text-gray-500 flex flex-wrap gap-x-3">
                <span>{b.customer.name}</span>
                {b.customer.phone && <span>{b.customer.phone}</span>}
                {b.customer.email && <span>{b.customer.email}</span>}
              </div>
            )}
            {(b.requested_date || b.requested_time) && (
              <div className="text-xs text-gray-500">
                {[b.requested_date, b.requested_time].filter(Boolean).join(' — ')}
              </div>
            )}
            {b.pet && (
              <div className="text-xs text-gray-500">
                🐾 {[b.pet.name, b.pet.breed, b.pet.size, b.pet.age].filter(Boolean).join(' · ')}
                {b.pet.allergies && ` · Allergies: ${b.pet.allergies}`}
                {b.pet.behavior_notes && ` · ${b.pet.behavior_notes}`}
              </div>
            )}
            {b.notes && <p className="text-sm text-gray-700">{b.notes}</p>}
            <select
              value={b.status}
              disabled={updating === b.id}
              onChange={e => updateStatus(b.id, e.target.value as Status)}
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
