'use client'

import { useEffect, useState } from 'react'
import { normalizePhone, phoneError } from '@/lib/phone'
import BrandedShell from '@/components/BrandedShell'
import { CardSection, Field, Input, Textarea, Select, SubmitButton, SuccessCard } from '@/components/form'

interface PlaceSuggestion {
  place_id: string
  description: string
}

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

interface Props {
  clientId: string
  businessName: string
  slug: string
  logoUrl: string | null
  tagline: string | null
  primaryColor: string | null
  heroUrl: string | null
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

export default function QuoteForm({ clientId, businessName, slug, logoUrl, tagline, primaryColor, heroUrl, showVehicleFields, showPropertyFields, showPhotoUpload }: Props) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [serviceCategory, setServiceCategory] = useState('')
  const [jobLocation, setJobLocation] = useState('')
  const [description, setDescription] = useState('')
  const [urgency, setUrgency] = useState('flexible')
  const [preferredDate, setPreferredDate] = useState('')
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
  const [propertyPlaceId, setPropertyPlaceId] = useState<string | null>(null)
  const [propertyAddressVerified, setPropertyAddressVerified] = useState(false)
  const [addressSuggestions, setAddressSuggestions] = useState<PlaceSuggestion[]>([])
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

  useEffect(() => {
    if (!showPropertyFields || propertyAddress.trim().length < 3) {
      setAddressSuggestions([])
      return
    }
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/places/autocomplete?input=${encodeURIComponent(propertyAddress)}&client_id=${encodeURIComponent(clientId)}`)
        const data = await res.json().catch(() => ({}))
        setAddressSuggestions(res.ok ? data.suggestions ?? [] : [])
      } catch {
        setAddressSuggestions([])
      }
    }, 400)
    return () => clearTimeout(timeout)
  }, [propertyAddress, showPropertyFields, clientId])

  async function selectAddressSuggestion(suggestion: PlaceSuggestion) {
    setAddressSuggestions([])
    try {
      const res = await fetch(`/api/places/details?place_id=${encodeURIComponent(suggestion.place_id)}&client_id=${encodeURIComponent(clientId)}`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.place_id) throw new Error('lookup failed')
      setPropertyAddress(data.formatted_address ?? suggestion.description)
      setPropertyPlaceId(data.place_id)
      setPropertyAddressVerified(true)
    } catch {
      setPropertyAddress(suggestion.description)
      setPropertyPlaceId(null)
      setPropertyAddressVerified(false)
    }
  }

  function handlePropertyAddressChange(value: string) {
    setPropertyAddress(value)
    setPropertyPlaceId(null)
    setPropertyAddressVerified(false)
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
        preferred_date: preferredDate || null,
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
        property_place_id: showPropertyFields ? propertyPlaceId : null,
        property_address_verified: showPropertyFields ? propertyAddressVerified : false,
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
      <BrandedShell businessName={businessName} logoUrl={logoUrl} tagline={tagline} heroUrl={heroUrl} primaryColor={primaryColor}>
        <SuccessCard
          businessName={businessName}
          logoUrl={logoUrl}
          slug={slug}
          title="Quote request sent!"
          message={`${businessName} will get back to you shortly with a quote.`}
        />
      </BrandedShell>
    )
  }

  return (
    <BrandedShell businessName={businessName} logoUrl={logoUrl} tagline={tagline} heroUrl={heroUrl} primaryColor={primaryColor}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="animate-card-enter rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h1 className="text-xl font-bold text-gray-900">Get a quote</h1>
          <p className="text-sm text-gray-500 mt-1">Tell {businessName} about the job and they'll get back to you.</p>
        </div>

        <CardSection title="Your details" delay={60}>
          <Input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="Your name *" />
          <Input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone number" />
          <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" />
        </CardSection>

        <CardSection title="The job" delay={120}>
          <Input type="text" value={serviceCategory} onChange={e => setServiceCategory(e.target.value)} placeholder="Service needed (optional)" />
          <Input type="text" value={jobLocation} onChange={e => setJobLocation(e.target.value)} placeholder="Job location (optional)" />
          <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe what you need (optional)" rows={3} />

          <Field label="Urgency">
            <Select value={urgency} onChange={e => setUrgency(e.target.value)}>
              {URGENCY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          </Field>

          <Field label="Preferred date (optional)">
            <Input type="date" value={preferredDate} onChange={e => setPreferredDate(e.target.value)} />
          </Field>

          {showPhotoUpload && (
            <Field label={`Add photos (${photos.length}/5)`}>
              <input type="file" accept="image/*" multiple disabled={photos.length >= 5} onChange={handlePhotoSelect} className="text-sm" />
              {photos.length > 0 && (
                <ul className="space-y-1 mt-2">
                  {photos.map((p, i) => (
                    <li key={i} className="flex items-center justify-between text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                      <span className="truncate">{p.file.name}{p.uploading ? ' — uploading…' : p.error ? ` — ${p.error}` : ''}</span>
                      <button type="button" onClick={() => removePhoto(i)} className="text-gray-400 hover:text-gray-600 ml-2">✕</button>
                    </li>
                  ))}
                </ul>
              )}
            </Field>
          )}
        </CardSection>

        {showVehicleFields && (
          <CardSection title="Vehicle (optional)" delay={180}>
            <Input type="text" value={vehicleMake} onChange={e => setVehicleMake(e.target.value)} placeholder="Make" />
            <Input type="text" value={vehicleModel} onChange={e => setVehicleModel(e.target.value)} placeholder="Model" />
            <Input type="text" value={vehicleColor} onChange={e => setVehicleColor(e.target.value)} placeholder="Color" />
            <Input type="number" value={vehicleYear} onChange={e => setVehicleYear(e.target.value)} placeholder="Year" />
            <Input type="text" value={vehiclePlate} onChange={e => setVehiclePlate(e.target.value)} placeholder="License plate" />
            <Input type="text" value={vehicleVin} onChange={e => setVehicleVin(e.target.value)} placeholder="VIN" />
            <Input type="number" value={vehicleMileage} onChange={e => setVehicleMileage(e.target.value)} placeholder="Mileage/hours" />
            <Textarea value={vehicleNotes} onChange={e => setVehicleNotes(e.target.value)} placeholder="Issue notes" rows={2} />
          </CardSection>
        )}

        {showPropertyFields && (
          <CardSection title="Property (optional)" delay={240}>
            <div className="relative">
              <Input type="text" value={propertyAddress} onChange={e => handlePropertyAddressChange(e.target.value)} placeholder="Address" autoComplete="off" />
              {propertyAddressVerified && (
                <span className="absolute right-3 top-3.5 text-xs text-green-700">Verified</span>
              )}
              {addressSuggestions.length > 0 && (
                <ul className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                  {addressSuggestions.map(s => (
                    <li key={s.place_id}>
                      <button type="button" onClick={() => selectAddressSuggestion(s)} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                        {s.description}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <Input type="text" value={propertyGateCode} onChange={e => setPropertyGateCode(e.target.value)} placeholder="Gate code" />
            <Input type="text" value={propertyParkingInstructions} onChange={e => setPropertyParkingInstructions(e.target.value)} placeholder="Parking instructions" />
            <Input type="text" value={propertyPetsOnSite} onChange={e => setPropertyPetsOnSite(e.target.value)} placeholder="Pets on site" />
            <Textarea value={propertyAccessNotes} onChange={e => setPropertyAccessNotes(e.target.value)} placeholder="Access notes" rows={2} />
            <Input type="text" value={propertyPreferredServiceDay} onChange={e => setPropertyPreferredServiceDay(e.target.value)} placeholder="Preferred service day" />
            <Input type="text" value={propertyLawnSize} onChange={e => setPropertyLawnSize(e.target.value)} placeholder="Lawn size" />
            <Input type="text" value={propertySnowRemovalAreas} onChange={e => setPropertySnowRemovalAreas(e.target.value)} placeholder="Snow removal areas" />
            <Textarea value={propertyCleaningInstructions} onChange={e => setPropertyCleaningInstructions(e.target.value)} placeholder="Cleaning instructions" rows={2} />
            <Textarea value={propertySafetyNotes} onChange={e => setPropertySafetyNotes(e.target.value)} placeholder="Safety notes" rows={2} />
          </CardSection>
        )}

        <CardSection title="How should we reach you?" delay={300}>
          <Select value={preferredContact} onChange={e => setPreferredContact(e.target.value)}>
            {CONTACT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        </CardSection>

        <CardSection delay={360}>
          <p className="text-xs text-gray-500">{CONSENT_TEXT}</p>
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={smsConsent} onChange={e => setSmsConsent(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-gray-300" />
            <span className="text-sm text-gray-700">Yes, send me text message updates</span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={emailConsent} onChange={e => setEmailConsent(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-gray-300" />
            <span className="text-sm text-gray-700">Yes, send me email updates</span>
          </label>
        </CardSection>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <SubmitButton loading={submitting} loadingLabel="Sending…" disabled={submitting || !name.trim()}>
          Request quote
        </SubmitButton>
      </form>
    </BrandedShell>
  )
}
