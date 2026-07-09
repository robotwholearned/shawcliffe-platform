'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useEnabledComponents } from '@/lib/use-enabled-components'

interface Customer {
  id: string
  name: string
  phone: string | null
  email: string | null
  sms_consent: boolean
  email_consent: boolean
  push_consent: boolean
  whatsapp_consent: boolean
  signup_source: string | null
  product_interests: string[]
  consent_timestamp: string
}

export default function CustomersPage() {
  const { has, loading: gateLoading } = useEnabledComponents()
  const [customers, setCustomers] = useState<Customer[] | null>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [q, setQ] = useState('')
  const [reviewStatus, setReviewStatus] = useState<Record<string, 'sending' | 'sent' | 'error'>>({})
  const pageSize = 25

  async function requestReview(customerId: string) {
    setReviewStatus(prev => ({ ...prev, [customerId]: 'sending' }))
    const res = await fetch(`/api/seller/customers/${customerId}/request-review`, { method: 'POST' })
    setReviewStatus(prev => ({ ...prev, [customerId]: res.ok ? 'sent' : 'error' }))
  }

  useEffect(() => {
    if (gateLoading || !has('customer_database')) return
    const controller = new AbortController()
    setCustomers(null)
    const params = new URLSearchParams({ page: String(page) })
    if (q.trim()) params.set('q', q.trim())
    fetch(`/api/seller/customers?${params}`, { signal: controller.signal })
      .then(r => (r.ok ? r.json() : { customers: [], total: 0 }))
      .then(d => { setCustomers(d.customers ?? []); setTotal(d.total ?? 0) })
      .catch(() => {})
    return () => controller.abort()
  }, [gateLoading, has, page, q])

  if (gateLoading) {
    return <div className="flex items-center justify-center min-h-screen"><p className="text-sm text-gray-400">Loading…</p></div>
  }

  if (!has('customer_database')) {
    return (
      <div className="flex items-center justify-center min-h-screen px-6">
        <p className="text-sm text-gray-400 text-center">Customer Database isn't enabled for your account.</p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4 pb-24">
      <header className="flex items-center gap-3 pt-2">
        <Link href="/seller" className="text-sm text-blue-600 hover:text-blue-700">← Back</Link>
        <h1 className="text-lg font-bold text-gray-900">Customers</h1>
      </header>

      <input
        value={q}
        onChange={e => { setPage(0); setQ(e.target.value) }}
        placeholder="Search name, phone, or email"
        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      <section className="bg-white rounded-2xl shadow-sm divide-y divide-gray-50">
        {customers === null && <p className="text-sm text-gray-400 py-8 text-center">Loading…</p>}
        {customers?.length === 0 && <p className="text-sm text-gray-400 py-8 text-center">No customers found.</p>}
        {customers?.map(c => (
          <div key={c.id} className="px-4 py-3 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-gray-800 truncate">{c.name}</span>
              {c.signup_source && (
                <span className="text-xs text-gray-400 flex-shrink-0 uppercase">{c.signup_source}</span>
              )}
            </div>
            <div className="text-xs text-gray-500 flex flex-wrap gap-x-3">
              {c.phone && <span>{c.phone}</span>}
              {c.email && <span>{c.email}</span>}
            </div>
            <div className="flex flex-wrap gap-1.5 text-xs text-gray-400">
              {c.sms_consent && <span className="px-1.5 py-0.5 bg-gray-100 rounded-full">SMS</span>}
              {c.email_consent && <span className="px-1.5 py-0.5 bg-gray-100 rounded-full">Email</span>}
              {c.push_consent && <span className="px-1.5 py-0.5 bg-gray-100 rounded-full">Push</span>}
              {c.whatsapp_consent && <span className="px-1.5 py-0.5 bg-gray-100 rounded-full">WhatsApp</span>}
            </div>
            {has('review_request_system') && (c.sms_consent || c.email_consent) && (
              <button
                onClick={() => requestReview(c.id)}
                disabled={reviewStatus[c.id] === 'sending'}
                className="mt-1 text-xs text-blue-600 hover:text-blue-700 disabled:opacity-50"
              >
                {reviewStatus[c.id] === 'sent' ? 'Review request sent ✓'
                  : reviewStatus[c.id] === 'error' ? 'Failed — try again'
                  : reviewStatus[c.id] === 'sending' ? 'Sending…'
                  : 'Request Review'}
              </button>
            )}
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
