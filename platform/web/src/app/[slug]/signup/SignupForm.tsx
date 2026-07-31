'use client'

import { useState } from 'react'
import { normalizePhone, phoneError } from '@/lib/phone'
import { emailError } from '@/lib/email'
import BrandedShell from '@/components/BrandedShell'
import { CardSection, Field, Input, SubmitButton, SuccessCard } from '@/components/form'

const CONSENT_TEXT = "I agree to receive updates about today's availability, location, and products. Message frequency varies. Reply STOP to unsubscribe. Message & data rates may apply."

interface Props {
  clientId: string
  businessName: string
  slug: string
  logoUrl: string | null
  tagline: string | null
  primaryColor: string | null
  heroUrl: string | null
}

export default function SignupForm({ clientId, businessName, slug, logoUrl, tagline, primaryColor, heroUrl }: Props) {
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
    if (email && emailError(email)) { setError(emailError(email)!); return }
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
      <BrandedShell businessName={businessName} logoUrl={logoUrl} tagline={tagline} heroUrl={heroUrl} primaryColor={primaryColor}>
        <SuccessCard
          businessName={businessName}
          logoUrl={logoUrl}
          slug={slug}
          title="You're signed up!"
          message={`We'll send you updates from ${businessName} about today's hours, location, and what's available.`}
        />
      </BrandedShell>
    )
  }

  return (
    <BrandedShell businessName={businessName} logoUrl={logoUrl} tagline={tagline} heroUrl={heroUrl} primaryColor={primaryColor}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="animate-card-enter rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h1 className="text-xl font-bold text-gray-900">Stay in the loop</h1>
          <p className="text-sm text-gray-500 mt-1">
            Get updates from {businessName} — hours, location, and what's fresh today.
          </p>
        </div>

        <CardSection title="Your details" delay={60}>
          <Field label={<>Your name <span className="text-red-500">*</span></>}>
            <Input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="Jane Smith" />
          </Field>
          <Field label="Phone number">
            <Input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(289) 555-0100" />
          </Field>
          <Field label="Email address">
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jane@example.com" />
          </Field>
        </CardSection>

        <CardSection delay={120}>
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
        </CardSection>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <SubmitButton loading={submitting} loadingLabel="Signing up…" disabled={submitting}>
          Sign me up
        </SubmitButton>
      </form>
    </BrandedShell>
  )
}
