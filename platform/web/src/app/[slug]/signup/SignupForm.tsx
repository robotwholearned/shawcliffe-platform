'use client'

import { useState } from 'react'
import { normalizePhone, phoneError } from '@/lib/phone'

const CONSENT_TEXT = "I agree to receive updates about today's availability, location, and products. Message frequency varies. Reply STOP to unsubscribe. Message & data rates may apply."

interface Props {
  clientId: string
  businessName: string
  slug: string
}

export default function SignupForm({ clientId, businessName, slug }: Props) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [smsConsent, setSmsConsent] = useState(false)
  const [emailConsent, setEmailConsent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!phone && !email) { setError('Enter a phone number or email.'); return }
    if (phone && phoneError(phone)) { setError(phoneError(phone)!); return }
    if (!smsConsent && !emailConsent) { setError('Please check at least one consent option.'); return }

    setSubmitting(true)
    setError(null)

    const normalizedPhone = phone ? normalizePhone(phone) : null
    const res = await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId, name, phone: normalizedPhone, email, sms_consent: smsConsent, email_consent: emailConsent, signup_source: 'website' }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Something went wrong. Please try again.')
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
          <h1 className="text-xl font-bold text-gray-900">You're signed up!</h1>
          <p className="text-sm text-gray-500">
            We'll send you updates from {businessName} about today's hours, location, and what's available.
          </p>
          <a href={`/${slug}`} className="inline-block text-sm text-[var(--brand-primary,#2563eb)] hover:underline mt-2">
            ← Back to storefront
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen px-4 py-8 max-w-md mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Stay in the loop</h1>
        <p className="text-sm text-gray-500 mt-1">
          Get updates from {businessName} — hours, location, and what's fresh today.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Your name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Jane Smith"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary,#2563eb)]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone number</label>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="(289) 555-0100"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary,#2563eb)]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="jane@example.com"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary,#2563eb)]"
          />
        </div>

        <div className="bg-gray-50 rounded-xl p-4 space-y-3">
          <p className="text-xs text-gray-500">{CONSENT_TEXT}</p>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={smsConsent}
              onChange={e => setSmsConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">Yes, send me text message updates</span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={emailConsent}
              onChange={e => setEmailConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">Yes, send me email updates</span>
          </label>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-[var(--brand-primary,#2563eb)] text-white rounded-xl py-3.5 text-sm font-semibold hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
        >
          {submitting ? 'Signing up…' : 'Sign me up'}
        </button>
      </form>
    </div>
  )
}
