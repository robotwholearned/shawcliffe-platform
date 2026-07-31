'use client'

import { useRef, useState } from 'react'
import { normalizePhone, phoneError } from '@/lib/phone'
import { emailError } from '@/lib/email'
import type { DocumentChecklistItem } from '@/lib/supabase/types'
import BrandedShell from '@/components/BrandedShell'
import { CardSection, Input } from '@/components/form'

const CONSENT_TEXT = 'I agree to be contacted about my submission. Message frequency varies. Reply STOP to unsubscribe. Message & data rates may apply.'

const MAX_FILE_BYTES = 8 * 1024 * 1024 // 8MB — mirrors MAX_FILE_BYTES in api/document-checklist/submit
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/heic', 'image/webp', 'application/pdf']

type UploadStatus = 'idle' | 'uploading' | 'uploaded' | 'failed'
interface UploadState {
  status: UploadStatus
  error?: string
}

interface Props {
  clientId: string
  businessName: string
  slug: string
  logoUrl: string | null
  tagline: string | null
  primaryColor: string | null
  heroUrl: string | null
  initialItems: DocumentChecklistItem[]
}

export default function DocumentsForm({ clientId, businessName, slug, logoUrl, tagline, primaryColor, heroUrl, initialItems }: Props) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [smsConsent, setSmsConsent] = useState(false)
  const [emailConsent, setEmailConsent] = useState(false)
  const [contactError, setContactError] = useState<string | null>(null)
  const [uploadStates, setUploadStates] = useState<Record<string, UploadState>>({})
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  function startUpload(itemId: string) {
    setContactError(null)
    if (!name.trim()) { setContactError('Enter your name before uploading.'); return }
    if (!phone && !email) { setContactError('Enter a phone number or email before uploading.'); return }
    if (phone && phoneError(phone)) { setContactError(phoneError(phone)!); return }
    if (email && emailError(email)) { setContactError(emailError(email)!); return }
    fileInputRefs.current[itemId]?.click()
  }

  async function handleFileChange(item: DocumentChecklistItem, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    if (!ALLOWED_TYPES.includes(file.type)) {
      setUploadStates(prev => ({ ...prev, [item.id]: { status: 'failed', error: 'Unsupported file type.' } }))
      return
    }
    if (file.size > MAX_FILE_BYTES) {
      setUploadStates(prev => ({ ...prev, [item.id]: { status: 'failed', error: 'File is too large (max 8MB).' } }))
      return
    }

    setUploadStates(prev => ({ ...prev, [item.id]: { status: 'uploading' } }))

    const normalizedPhone = phone ? normalizePhone(phone) : null
    const formData = new FormData()
    formData.set('client_id', clientId)
    formData.set('name', name)
    formData.set('phone', normalizedPhone ?? '')
    formData.set('email', email)
    formData.set('sms_consent', String(smsConsent))
    formData.set('email_consent', String(emailConsent))
    formData.set('checklist_item_id', item.id)
    formData.set('file', file)

    try {
      const res = await fetch('/api/document-checklist/submit', { method: 'POST', body: formData })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setUploadStates(prev => ({ ...prev, [item.id]: { status: 'failed', error: data.error ?? 'Upload failed.' } }))
        return
      }
      setUploadStates(prev => ({ ...prev, [item.id]: { status: 'uploaded' } }))
    } catch {
      setUploadStates(prev => ({ ...prev, [item.id]: { status: 'failed', error: 'Upload failed.' } }))
    }
  }

  return (
    <BrandedShell businessName={businessName} logoUrl={logoUrl} tagline={tagline} heroUrl={heroUrl} primaryColor={primaryColor}>
      <div className="space-y-4">
        <div className="animate-card-enter rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h1 className="text-xl font-bold text-gray-900">Documents</h1>
          <p className="text-sm text-gray-500 mt-1">{businessName} needs a few things from you.</p>
        </div>

        {initialItems.length === 0 ? (
          <CardSection delay={60}>
            <p className="text-sm text-gray-400 py-4 text-center">No checklist items yet.</p>
          </CardSection>
        ) : (
          <>
            <CardSection title="Your details" delay={60}>
              <Input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="Your name *" />
              <Input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone number" />
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" />
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
              {contactError && <p className="text-sm text-red-600">{contactError}</p>}
            </CardSection>

            <CardSection title="Checklist" delay={120}>
              {initialItems.map(item => {
                const state = uploadStates[item.id] ?? { status: 'idle' as UploadStatus }
                return (
                  <div key={item.id} className="bg-gray-50 rounded-xl border border-gray-100 px-4 py-3 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-medium text-gray-900">{item.title}</p>
                      <span className={`text-xs flex-shrink-0 ${item.required ? 'text-brand-accent font-medium' : 'text-gray-400'}`}>
                        {item.required ? 'Required' : 'Optional'}
                      </span>
                    </div>
                    {item.description && <p className="text-xs text-gray-500">{item.description}</p>}
                    {item.needs_upload && (
                      <div>
                        <input
                          ref={el => { fileInputRefs.current[item.id] = el }}
                          type="file"
                          accept="image/jpeg,image/png,image/heic,image/webp,application/pdf"
                          className="hidden"
                          onChange={e => handleFileChange(item, e)}
                        />
                        {state.status === 'uploaded' && (
                          <p className="text-xs text-green-600 font-medium">✓ Uploaded</p>
                        )}
                        {state.status === 'uploading' && (
                          <p className="text-xs text-gray-500">Uploading…</p>
                        )}
                        {state.status === 'failed' && (
                          <div className="space-y-1">
                            <p className="text-xs text-red-600">{state.error}</p>
                            <button
                              type="button"
                              onClick={() => startUpload(item.id)}
                              className="text-xs font-medium text-brand-primary"
                            >
                              Try again
                            </button>
                          </div>
                        )}
                        {state.status === 'idle' && (
                          <button
                            type="button"
                            onClick={() => startUpload(item.id)}
                            className="text-xs font-medium text-brand-primary"
                          >
                            Upload
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </CardSection>
          </>
        )}

        <a href={`/${slug}`} className="block text-center text-sm text-brand-primary hover:underline">
          ← Back to storefront
        </a>
      </div>
    </BrandedShell>
  )
}
