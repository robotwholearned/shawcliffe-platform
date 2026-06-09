'use client'

import { useState } from 'react'
import type { Product } from '@/lib/supabase/types'

interface Props {
  clientId: string
  businessName: string
  slug: string
  initialProducts: Product[]
}

export default function PreorderForm({ clientId, businessName, slug, initialProducts }: Props) {
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function setQty(productId: string, qty: number) {
    setQuantities(prev => ({ ...prev, [productId]: Math.max(0, qty) }))
  }

  const selectedItems = Object.entries(quantities)
    .filter(([, qty]) => qty > 0)
    .map(([product_id, quantity]) => ({ product_id, quantity }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!phone && !email) { setError('Enter a phone number or email so we can confirm your order.'); return }
    if (selectedItems.length === 0) { setError('Select at least one product.'); return }

    setSubmitting(true)
    setError(null)

    const res = await fetch('/api/preorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        customer_name: name,
        customer_phone: phone || null,
        customer_email: email || null,
        items: selectedItems,
        notes: notes || null,
      }),
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      setError(
        res.status === 409
          ? `Sorry, ${data.product ?? 'that item'} is fully reserved. Try a smaller quantity.`
          : data.error ?? 'Something went wrong. Please try again.'
      )
      setSubmitting(false)
      return
    }

    setDone(true)
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center space-y-3 max-w-xs">
          <div className="text-5xl">✓</div>
          <h1 className="text-xl font-bold text-gray-900">Preorder confirmed!</h1>
          <p className="text-sm text-gray-500">
            {businessName} has your reservation. You'll receive a confirmation shortly.
          </p>
          <a href={`/${slug}`} className="inline-block text-sm text-[var(--brand-primary,#2563eb)] hover:underline mt-2">
            ← Back to storefront
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen px-4 py-8 max-w-md mx-auto space-y-6 pb-24">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reserve your order</h1>
        <p className="text-sm text-gray-500 mt-1">Pay at pickup — no payment required now.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <section className="space-y-2">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">What would you like?</h2>
          {initialProducts.length === 0 && (
            <p className="text-sm text-gray-400 py-4 text-center">No products available for preorder right now.</p>
          )}
          {initialProducts.map(p => (
            <div key={p.id} className="flex items-center justify-between bg-white rounded-xl border border-gray-100 px-4 py-3 shadow-sm">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                {p.price != null && <p className="text-xs text-gray-400">${p.price.toFixed(2)}</p>}
              </div>
              <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setQty(p.id, (quantities[p.id] ?? 0) - 1)}
                  className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 text-lg font-medium flex items-center justify-center hover:bg-gray-200"
                >
                  −
                </button>
                <span className="w-5 text-center text-sm font-medium">{quantities[p.id] ?? 0}</span>
                <button
                  type="button"
                  onClick={() => setQty(p.id, (quantities[p.id] ?? 0) + 1)}
                  className="w-8 h-8 rounded-full bg-[var(--brand-primary,#2563eb)] text-white text-lg font-medium flex items-center justify-center hover:opacity-90"
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </section>

        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Your details</h2>
          <input
            type="text"
            required
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Your name *"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary,#2563eb)]"
          />
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="Phone number"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary,#2563eb)]"
          />
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Email address"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary,#2563eb)]"
          />
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Any notes for your order? (optional)"
            rows={2}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary,#2563eb)] resize-none"
          />
        </section>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting || selectedItems.length === 0}
          className="w-full bg-[var(--brand-primary,#2563eb)] text-white rounded-xl py-3.5 text-sm font-semibold hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
        >
          {submitting
            ? 'Placing order…'
            : `Reserve ${selectedItems.reduce((s, i) => s + i.quantity, 0)} item${selectedItems.reduce((s, i) => s + i.quantity, 0) === 1 ? '' : 's'}`}
        </button>
      </form>
    </div>
  )
}
