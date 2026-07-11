'use client'

import { useState } from 'react'
import { normalizePhone, phoneError } from '@/lib/phone'

const CONSENT_TEXT = 'I agree to be contacted about my quote request. Message frequency varies. Reply STOP to unsubscribe. Message & data rates may apply.'

const URGENCY_OPTIONS: { value: string; label: string }[] = [
  { value: 'asap', label: 'ASAP' },
  { value: 'this_week', label: 'This week' },
  { value: 'this_month', label: 'This month' },
  { value: 'flexible', label: 'Flexible' },
]

const CONTACT_OPTIONS: { value: string; label: string }[] = [
  { value: 'phone', label: 'Phone' },
  { value: 'email', label: 'Email' },
  { value: 'sms', label: 'SMS' },
]

const inputClass = 'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary,#2563eb)]'
const labelClass = 'block text-sm font-medium text-gray-700 mb-1'

interface Props {
  clientId: string
  businessName: string
  slug: string
  showVehicleFields: boolean
  showPropertyFields: boolean
  showPhotoUpload: boolean
}

interface Photo {
  file: File
  url: string | null
  uploading: boolean
  error: string | null
}

export default function QuoteForm({ clientId, businessName, slug, showVehicleFields, showPropertyFields, showPhotoUpload }: Props) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [serviceCategory, setServiceCategory] = useState('')
  const [jobLocation, setJobLocation] = useState('')
  const [description, setDescription] = useState('')
  const [urgency, setUrgency] = useState('flexible')
  const [preferredContact, setPreferredContact] = useState('phone')
  const [smsConsent, setSmsConsent] = useState(false)
  const [emailConsent, setEmailConsent] = useState(false)
  const [photos, setPhotos] = useState<Photo[]>([])

  const [vehicleMake, setVehicleMake] = useState('')
  const [vehicleModel, setVehicleModel] = useState('')
  const [vehicleYear, setVehicleYear] = useState('')
  const [vehicleColor, setVehicleColor] = useState('')
  const [vehicleVin, setVehicleVin] = useState('')
  const [vehiclePlate, setVehiclePlate] = useState('')
  const [vehicleMileage, setVehicleMileage] = useState('')
  const [vehicleNotes, setVehicleNotes] = useState('')

  const [propertyAddress, setPropertyAddress] = useState('')
  const [propertyGateCode, setPropertyGateCode] = useState('')
  const [propertyParkingInstructions, setPropertyParkingInstructions] = useState('')
  const [propertyPetsOnSite, setPropertyPetsOnSite] = useState('')
  const [propertyAccessNotes, setPropertyAccessNotes] = useState('')
  const [propertyPreferredServiceDay, setPropertyPreferredServiceDay] = useState('')
  const [propertyLawnSize, setPropertyLawnSize] = useState('')
  const [propertySnowRemovalAreas, setPropertySnowRemovalAreas] = useState('')
  const [propertyCleaningInstructions, setPropertyCleaningInstructions] = useState('')
  const [propertySafetyNotes, setPropertySafetyNotes] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    for (const file of files) {
      const index = photos.length
      setPhotos(prev => [...prev, { file, url: null, uploading: true, error: null }])

      const formData = new FormData()
      formData.append('client_id', clientId)
      formData.append('file', file)
      formData.append('context', 'inquiry')

      try {
        const res = await fetch('/api/inquiry/photos', { method: 'POST', body: formData })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error ?? 'Upload failed')
        setPhotos(prev => prev.map((p, i) => (i === index ? { ...p, url: data.url, uploading: false } : p)))
      } catch (err) {
        setPhotos(prev => prev.map((p, i) => (i === index ? { ...p, uploading: false, error: err instanceof Error ? err.message : 'Upload failed' } : p)))
      }
    }
  }

  function removePhoto(index: number) {
    setPhotos(prev => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!phone && !email) { setError('Enter a phone number or email so we can send you a quote.'); return }
    if (phone && phoneError(phone)) { setError(phoneError(phone)!); return }

    setSubmitting(true)
    setError(null)

    const res = await fetch('/api/inquiry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        name,
        phone: phone ? normalizePhone(phone) : null,
        email: email || null,
        sms_consent: smsConsent,
        email_consent: emailConsent,
        signup_source: 'website',
        service_category: serviceCategory || null,
        job_location: jobLocation || null,
        urgency,
        description: description || null,
        photo_urls: photos.map(p => p.url).filter((url): url is string => !!url),
        preferred_contact_method: preferredContact,
        vehicle_make: showVehicleFields ? vehicleMake || null : null,
        vehicle_model: showVehicleFields ? vehicleModel || null : null,
        vehicle_year: showVehicleFields && vehicleYear ? Number(vehicleYear) : null,
        vehicle_vin: showVehicleFields ? vehicleVin || null : null,
        vehicle_plate: showVehicleFields ? vehiclePlate || null : null,
        vehicle_mileage: showVehicleFields && vehicleMileage ? Number(vehicleMileage) : null,
        vehicle_notes: showVehicleFields ? vehicleNotes || null : null,
        vehicle_color: showVehicleFields ? vehicleColor || null : null,
        property_address: showPropertyFields ? propertyAddress || null : null,
        property_gate_code: showPropertyFields ? propertyGateCode || null : null,
        property_parking_instructions: showPropertyFields ? propertyParkingInstructions || null : null,
        property_pets_on_site: showPropertyFields ? propertyPetsOnSite || null : null,
        property_access_notes: showPropertyFields ? propertyAccessNotes || null : null,
        property_preferred_service_day: showPropertyFields ? propertyPreferredServiceDay || null : null,
        property_lawn_size: showPropertyFields ? propertyLawnSize || null : null,
        property_snow_removal_areas: showPropertyFields ? propertySnowRemovalAreas || null : null,
        property_cleaning_instructions: showPropertyFields ? propertyCleaningInstructions || null : null,
        property_safety_notes: showPropertyFields ? propertySafetyNotes || null : null,
      }),
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
          <h1 className="text-xl font-bold text-gray-900">Quote request sent!</h1>
          <p className="text-sm text-gray-500">
            {businessName} will get back to you shortly with a quote.
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
        <h1 className="text-2xl font-bold text-gray-900">Get a quote</h1>
        <p className="text-sm text-gray-500 mt-1">Tell {businessName} about the job and they'll get back to you.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Your details</h2>
          <input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="Your name *" className={inputClass} />
          <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone number" className={inputClass} />
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" className={inputClass} />
        </section>

        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">The job</h2>
          <input type="text" value={serviceCategory} onChange={e => setServiceCategory(e.target.value)} placeholder="Service needed (optional)" className={inputClass} />
          <input type="text" value={jobLocation} onChange={e => setJobLocation(e.target.value)} placeholder="Job location (optional)" className={inputClass} />
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe what you need (optional)" rows={3} className={`${inputClass} resize-none`} />

          <div>
            <label className={labelClass}>Urgency</label>
            <select value={urgency} onChange={e => setUrgency(e.target.value)} className={inputClass}>
              {URGENCY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {showPhotoUpload && (
            <div className="space-y-2">
              <label className={labelClass}>Add photos ({photos.length}/5)</label>
              <input type="file" accept="image/*" multiple disabled={photos.length >= 5} onChange={handlePhotoSelect} className="text-sm" />
              {photos.length > 0 && (
                <ul className="space-y-1">
                  {photos.map((p, i) => (
                    <li key={i} className="flex items-center justify-between text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                      <span className="truncate">{p.file.name}{p.uploading ? ' — uploading…' : p.error ? ` — ${p.error}` : ''}</span>
                      <button type="button" onClick={() => removePhoto(i)} className="text-gray-400 hover:text-gray-600 ml-2">✕</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>

        {showVehicleFields && (
          <section className="space-y-3">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Vehicle (optional)</h2>
            <input type="text" value={vehicleMake} onChange={e => setVehicleMake(e.target.value)} placeholder="Make" className={inputClass} />
            <input type="text" value={vehicleModel} onChange={e => setVehicleModel(e.target.value)} placeholder="Model" className={inputClass} />
            <input type="text" value={vehicleColor} onChange={e => setVehicleColor(e.target.value)} placeholder="Color" className={inputClass} />
            <input type="number" value={vehicleYear} onChange={e => setVehicleYear(e.target.value)} placeholder="Year" className={inputClass} />
            <input type="text" value={vehiclePlate} onChange={e => setVehiclePlate(e.target.value)} placeholder="License plate" className={inputClass} />
            <input type="text" value={vehicleVin} onChange={e => setVehicleVin(e.target.value)} placeholder="VIN" className={inputClass} />
            <input type="number" value={vehicleMileage} onChange={e => setVehicleMileage(e.target.value)} placeholder="Mileage/hours" className={inputClass} />
            <textarea value={vehicleNotes} onChange={e => setVehicleNotes(e.target.value)} placeholder="Issue notes" rows={2} className={`${inputClass} resize-none`} />
          </section>
        )}

        {showPropertyFields && (
          <section className="space-y-3">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Property (optional)</h2>
            <input type="text" value={propertyAddress} onChange={e => setPropertyAddress(e.target.value)} placeholder="Address" className={inputClass} />
            <input type="text" value={propertyGateCode} onChange={e => setPropertyGateCode(e.target.value)} placeholder="Gate code" className={inputClass} />
            <input type="text" value={propertyParkingInstructions} onChange={e => setPropertyParkingInstructions(e.target.value)} placeholder="Parking instructions" className={inputClass} />
            <input type="text" value={propertyPetsOnSite} onChange={e => setPropertyPetsOnSite(e.target.value)} placeholder="Pets on site" className={inputClass} />
            <textarea value={propertyAccessNotes} onChange={e => setPropertyAccessNotes(e.target.value)} placeholder="Access notes" rows={2} className={`${inputClass} resize-none`} />
            <input type="text" value={propertyPreferredServiceDay} onChange={e => setPropertyPreferredServiceDay(e.target.value)} placeholder="Preferred service day" className={inputClass} />
            <input type="text" value={propertyLawnSize} onChange={e => setPropertyLawnSize(e.target.value)} placeholder="Lawn size" className={inputClass} />
            <input type="text" value={propertySnowRemovalAreas} onChange={e => setPropertySnowRemovalAreas(e.target.value)} placeholder="Snow removal areas" className={inputClass} />
            <textarea value={propertyCleaningInstructions} onChange={e => setPropertyCleaningInstructions(e.target.value)} placeholder="Cleaning instructions" rows={2} className={`${inputClass} resize-none`} />
            <textarea value={propertySafetyNotes} onChange={e => setPropertySafetyNotes(e.target.value)} placeholder="Safety notes" rows={2} className={`${inputClass} resize-none`} />
          </section>
        )}

        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">How should we reach you?</h2>
          <select value={preferredContact} onChange={e => setPreferredContact(e.target.value)} className={inputClass}>
            {CONTACT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </section>

        <div className="bg-gray-50 rounded-xl p-4 space-y-3">
          <p className="text-xs text-gray-500">{CONSENT_TEXT}</p>
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={smsConsent} onChange={e => setSmsConsent(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-gray-300" />
            <span className="text-sm text-gray-700">Yes, send me text message updates</span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={emailConsent} onChange={e => setEmailConsent(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-gray-300" />
            <span className="text-sm text-gray-700">Yes, send me email updates</span>
          </label>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting || !name.trim()}
          className="w-full bg-[var(--brand-primary,#2563eb)] text-white rounded-xl py-3.5 text-sm font-semibold hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
        >
          {submitting ? 'Sending…' : 'Request quote'}
        </button>
      </form>
    </div>
  )
}
