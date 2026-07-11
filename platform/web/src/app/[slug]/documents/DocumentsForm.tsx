'use client'

import { useRef, useState } from 'react'
import { normalizePhone, phoneError } from '@/lib/phone'
import type { DocumentChecklistItem } from '@/lib/supabase/types'

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
  initialItems: DocumentChecklistItem[]
}

export default function DocumentsForm({ clientId, businessName, slug, initialItems }: Props) {
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
    <div className="min-h-screen px-4 py-8 max-w-md mx-auto space-y-6 pb-24">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
        <p className="text-sm text-gray-500 mt-1">{businessName} needs a few things from you.</p>
      </div>

      {initialItems.length === 0 ? (
        <p className="text-sm text-gray-400 py-4 text-center">No checklist items yet.</p>
      ) : (
        <>
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
          </section>

          <section className="space-y-2">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Checklist</h2>
            {initialItems.map(item => {
              const state = uploadStates[item.id] ?? { status: 'idle' as UploadStatus }
              return (
                <div key={item.id} className="bg-white rounded-xl border border-gray-100 px-4 py-3 shadow-sm space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium text-gray-900">{item.title}</p>
                    <span className={`text-xs flex-shrink-0 ${item.required ? 'text-orange-500' : 'text-gray-400'}`}>
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
                            className="text-xs font-medium text-[var(--brand-primary,#2563eb)]"
                          >
                            Try again
                          </button>
                        </div>
                      )}
                      {state.status === 'idle' && (
                        <button
                          type="button"
                          onClick={() => startUpload(item.id)}
                          className="text-xs font-medium text-[var(--brand-primary,#2563eb)]"
                        >
                          Upload
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </section>
        </>
      )}

      <a href={`/${slug}`} className="block text-center text-sm text-[var(--brand-primary,#2563eb)] hover:underline">
        ← Back to storefront
      </a>
    </div>
  )
}
