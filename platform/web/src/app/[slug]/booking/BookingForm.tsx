'use client'

import { useState } from 'react'
import { normalizePhone, phoneError } from '@/lib/phone'

interface Props {
  clientId: string
  businessName: string
  slug: string
  showPetFields: boolean
}

const TIME_PREFERENCES = ['morning', 'afternoon', 'evening', 'flexible'] as const

export default function BookingForm({ clientId, businessName, slug, showPetFields }: Props) {
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
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center space-y-3 max-w-xs">
          <div className="text-5xl">✓</div>
          <h1 className="text-xl font-bold text-gray-900">Booking request sent!</h1>
          <p className="text-sm text-gray-500">
            {businessName} will confirm your booking soon.
          </p>
          <a href={`/${slug}`} className="inline-block text-sm text-[var(--brand-primary,#2563eb)] hover:underline mt-2">
            ← Back to storefront
          </a>
        </div>
      </div>
    )
  }

  const inputClass = 'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary,#2563eb)]'

  return (
    <div className="min-h-screen px-4 py-8 max-w-md mx-auto space-y-6 pb-24">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Request a booking</h1>
        <p className="text-sm text-gray-500 mt-1">{businessName} will confirm with you soon.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Your details</h2>
          <input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="Your name *" className={inputClass} />
          <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone number" className={inputClass} />
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" className={inputClass} />
        </section>

        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">The booking</h2>
          <input type="text" value={service} onChange={e => setService(e.target.value)} placeholder="Service needed (optional)" className={inputClass} />

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={hasPreferredDate} onChange={e => setHasPreferredDate(e.target.checked)} className="rounded" />
            I have a preferred date
          </label>
          {hasPreferredDate && (
            <input type="date" value={preferredDate} onChange={e => setPreferredDate(e.target.value)} className={inputClass} />
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
                      ? 'bg-[var(--brand-primary,#2563eb)] text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Anything else we should know? (optional)"
            rows={2}
            className={`${inputClass} resize-none`}
          />
        </section>

        {showPetFields && (
          <section className="space-y-3">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Pet (optional)</h2>
            <input type="text" value={petName} onChange={e => setPetName(e.target.value)} placeholder="Pet name" className={inputClass} />
            <input type="text" value={petBreed} onChange={e => setPetBreed(e.target.value)} placeholder="Breed" className={inputClass} />
            <div className="grid grid-cols-2 gap-3">
              <input type="text" value={petSize} onChange={e => setPetSize(e.target.value)} placeholder="Size" className={inputClass} />
              <input type="text" value={petAge} onChange={e => setPetAge(e.target.value)} placeholder="Age" className={inputClass} />
            </div>
            <input type="text" value={petAllergies} onChange={e => setPetAllergies(e.target.value)} placeholder="Allergies" className={inputClass} />
            <textarea value={petBehaviorNotes} onChange={e => setPetBehaviorNotes(e.target.value)} placeholder="Behaviour notes" rows={2} className={`${inputClass} resize-none`} />
            <input type="text" value={petGroomingPreferences} onChange={e => setPetGroomingPreferences(e.target.value)} placeholder="Grooming preferences" className={inputClass} />
            <input type="text" value={petVaccinationInfo} onChange={e => setPetVaccinationInfo(e.target.value)} placeholder="Vaccination info" className={inputClass} />
            <input type="text" value={petEmergencyContact} onChange={e => setPetEmergencyContact(e.target.value)} placeholder="Emergency contact" className={inputClass} />
            <textarea value={petCareInstructions} onChange={e => setPetCareInstructions(e.target.value)} placeholder="Care instructions" rows={2} className={`${inputClass} resize-none`} />
          </section>
        )}

        <section className="space-y-2 text-xs text-gray-500">
          <p>I agree to be contacted about my booking request. Message frequency varies. Reply STOP to unsubscribe. Message &amp; data rates may apply.</p>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={smsConsent} onChange={e => setSmsConsent(e.target.checked)} className="rounded" />
            Yes, send me text message updates
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={emailConsent} onChange={e => setEmailConsent(e.target.checked)} className="rounded" />
            Yes, send me email updates
          </label>
        </section>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting || !name.trim()}
          className="w-full bg-[var(--brand-primary,#2563eb)] text-white rounded-xl py-3.5 text-sm font-semibold hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
        >
          {submitting ? 'Sending request…' : 'Request Booking'}
        </button>
      </form>
    </div>
  )
}
