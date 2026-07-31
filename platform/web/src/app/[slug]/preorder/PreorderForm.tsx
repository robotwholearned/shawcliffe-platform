'use client'

import { useState } from 'react'
import type { Product } from '@/lib/supabase/types'
import { normalizePhone, phoneError } from '@/lib/phone'
import { emailError } from '@/lib/email'
import BrandedShell from '@/components/BrandedShell'
import { CardSection, Input, Textarea, SubmitButton, SuccessCard } from '@/components/form'

interface Props {
  clientId: string
  businessName: string
  slug: string
  logoUrl: string | null
  tagline: string | null
  primaryColor: string | null
  heroUrl: string | null
  initialProducts: Product[]
}

export default function PreorderForm({ clientId, businessName, slug, logoUrl, tagline, primaryColor, heroUrl, initialProducts }: Props) {
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
    if (phone && phoneError(phone)) { setError(phoneError(phone)!); return }
    if (email && emailError(email)) { setError(emailError(email)!); return }
    if (selectedItems.length === 0) { setError('Select at least one product.'); return }

    setSubmitting(true)
    setError(null)

    const normalizedPhone = phone ? normalizePhone(phone) : null
    const res = await fetch('/api/preorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        customer_name: name,
        customer_phone: normalizedPhone,
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
      <BrandedShell businessName={businessName} logoUrl={logoUrl} tagline={tagline} heroUrl={heroUrl} primaryColor={primaryColor}>
        <SuccessCard
          businessName={businessName}
          logoUrl={logoUrl}
          slug={slug}
          title="Preorder confirmed!"
          message={`${businessName} has your reservation. You'll receive a confirmation shortly.`}
        />
      </BrandedShell>
    )
  }

  return (
    <BrandedShell businessName={businessName} logoUrl={logoUrl} tagline={tagline} heroUrl={heroUrl} primaryColor={primaryColor}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="animate-card-enter rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h1 className="text-xl font-bold text-gray-900">Reserve your order</h1>
          <p className="text-sm text-gray-500 mt-1">Pay at pickup — no payment required now.</p>
        </div>

        <CardSection title="What would you like?" delay={60}>
          {initialProducts.length === 0 && (
            <p className="text-sm text-gray-400 py-4 text-center">No products available for preorder right now.</p>
          )}
          {initialProducts.map(p => (
            <div key={p.id} className="flex items-center justify-between bg-gray-50 rounded-xl border border-gray-100 px-4 py-3">
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
                  className="w-8 h-8 rounded-full bg-brand-primary text-white text-lg font-medium flex items-center justify-center hover:opacity-90"
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </CardSection>

        <CardSection title="Your details" delay={120}>
          <Input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="Your name *" />
          <Input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone number" />
          <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" />
          <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any notes for your order? (optional)" rows={2} />
        </CardSection>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <SubmitButton
          loading={submitting}
          loadingLabel="Placing order…"
          disabled={submitting || selectedItems.length === 0}
        >
          {`Reserve ${selectedItems.reduce((s, i) => s + i.quantity, 0)} item${selectedItems.reduce((s, i) => s + i.quantity, 0) === 1 ? '' : 's'}`}
        </SubmitButton>
      </form>
    </BrandedShell>
  )
}
