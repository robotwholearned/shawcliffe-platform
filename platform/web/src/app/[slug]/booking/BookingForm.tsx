'use client'

import { useState } from 'react'
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
  showPetFields: boolean
}

const TIME_PREFERENCES = ['morning', 'afternoon', 'evening', 'flexible'] as const

export default function BookingForm({ clientId, businessName, slug, logoUrl, tagline, primaryColor, heroUrl, showPetFields }: Props) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [service, setService] = useState('')
  const [hasPreferredDate, setHasPreferredDate] = useState(false)
  const [preferredDate, setPreferredDate] = useState('')
  const [timePreference, setTimePreference] = useState<typeof TIME_PREFERENCES[number]>('flexible')
  const [notes, setNotes] = useState('')
  const [smsConsent, setSmsConsent] = useState(false)
  const [emailConsent, setEmailConsent] = useState(false)

  const [petName, setPetName] = useState('')
  const [petBreed, setPetBreed] = useState('')
  const [petSize, setPetSize] = useState('')
  const [petAge, setPetAge] = useState('')
  const [petAllergies, setPetAllergies] = useState('')
  const [petBehaviorNotes, setPetBehaviorNotes] = useState('')
  const [petGroomingPreferences, setPetGroomingPreferences] = useState('')
  const [petVaccinationInfo, setPetVaccinationInfo] = useState('')
  const [petEmergencyContact, setPetEmergencyContact] = useState('')
  const [petCareInstructions, setPetCareInstructions] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Enter your name.'); return }
    if (!phone && !email) { setError('Enter a phone number or email so we can confirm your booking.'); return }
    if (phone && phoneError(phone)) { setError(phoneError(phone)!); return }
    if (email && emailError(email)) { setError(emailError(email)!); return }

    setSubmitting(true)
    setError(null)

    const res = await fetch('/api/booking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        name,
        phone: phone ? normalizePhone(phone) : null,
        email: email || null,
        sms_consent: smsConsent,
        email_consent: emailConsent,
        signup_source: 'web',
        service: service || null,
        requested_date: hasPreferredDate && preferredDate ? preferredDate : null,
        requested_time: timePreference,
        notes: notes || null,
        ...(showPetFields && {
          pet_name: petName || null,
          pet_breed: petBreed || null,
          pet_size: petSize || null,
          pet_age: petAge || null,
          pet_allergies: petAllergies || null,
          pet_behavior_notes: petBehaviorNotes || null,
          pet_grooming_preferences: petGroomingPreferences || null,
          pet_vaccination_info: petVaccinationInfo || null,
          pet_emergency_contact: petEmergencyContact || null,
          pet_care_instructions: petCareInstructions || null,
        }),
      }),
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
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
          title="Booking request sent!"
          message={`${businessName} will confirm your booking soon.`}
        />
      </BrandedShell>
    )
  }

  return (
    <BrandedShell businessName={businessName} logoUrl={logoUrl} tagline={tagline} heroUrl={heroUrl} primaryColor={primaryColor}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="animate-card-enter rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h1 className="text-xl font-bold text-gray-900">Request a booking</h1>
          <p className="text-sm text-gray-500 mt-1">{businessName} will confirm with you soon.</p>
        </div>

        <CardSection title="Your details" delay={60}>
          <Input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="Your name *" />
          <Input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone number" />
          <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" />
        </CardSection>

        <CardSection title="The booking" delay={120}>
          <Input type="text" value={service} onChange={e => setService(e.target.value)} placeholder="Service needed (optional)" />

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={hasPreferredDate} onChange={e => setHasPreferredDate(e.target.checked)} className="rounded" />
            I have a preferred date
          </label>
          {hasPreferredDate && (
            <Input type="date" value={preferredDate} onChange={e => setPreferredDate(e.target.value)} />
          )}

          <div>
            <p className="text-xs text-gray-500 mb-1.5">Preferred time</p>
            <div className="grid grid-cols-4 gap-1.5">
              {TIME_PREFERENCES.map(option => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setTimePreference(option)}
                  className={`rounded-lg py-2 text-xs font-medium capitalize transition-colors ${
                    timePreference === option
                      ? 'bg-brand-primary text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <Textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Anything else we should know? (optional)"
            rows={2}
          />
        </CardSection>

        {showPetFields && (
          <CardSection title="Pet (optional)" delay={180}>
            <Input type="text" value={petName} onChange={e => setPetName(e.target.value)} placeholder="Pet name" />
            <Input type="text" value={petBreed} onChange={e => setPetBreed(e.target.value)} placeholder="Breed" />
            <div className="grid grid-cols-2 gap-3">
              <Input type="text" value={petSize} onChange={e => setPetSize(e.target.value)} placeholder="Size" />
              <Input type="text" value={petAge} onChange={e => setPetAge(e.target.value)} placeholder="Age" />
            </div>
            <Input type="text" value={petAllergies} onChange={e => setPetAllergies(e.target.value)} placeholder="Allergies" />
            <Textarea value={petBehaviorNotes} onChange={e => setPetBehaviorNotes(e.target.value)} placeholder="Behaviour notes" rows={2} />
            <Input type="text" value={petGroomingPreferences} onChange={e => setPetGroomingPreferences(e.target.value)} placeholder="Grooming preferences" />
            <Input type="text" value={petVaccinationInfo} onChange={e => setPetVaccinationInfo(e.target.value)} placeholder="Vaccination info" />
            <Input type="text" value={petEmergencyContact} onChange={e => setPetEmergencyContact(e.target.value)} placeholder="Emergency contact" />
            <Textarea value={petCareInstructions} onChange={e => setPetCareInstructions(e.target.value)} placeholder="Care instructions" rows={2} />
          </CardSection>
        )}

        <CardSection delay={240} className="text-xs text-gray-500">
          <p>I agree to be contacted about my booking request. Message frequency varies. Reply STOP to unsubscribe. Message &amp; data rates may apply.</p>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={smsConsent} onChange={e => setSmsConsent(e.target.checked)} className="rounded" />
            Yes, send me text message updates
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={emailConsent} onChange={e => setEmailConsent(e.target.checked)} className="rounded" />
            Yes, send me email updates
          </label>
        </CardSection>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <SubmitButton loading={submitting} loadingLabel="Sending request…" disabled={submitting || !name.trim()}>
          Request Booking
        </SubmitButton>
      </form>
    </BrandedShell>
  )
}
