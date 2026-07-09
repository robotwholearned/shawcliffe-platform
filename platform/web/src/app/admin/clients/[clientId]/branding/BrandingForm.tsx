'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ClientBranding, FontTheme } from '@/lib/supabase/types'

interface Props {
  clientId: string
  branding: ClientBranding | null
}

const FONT_THEME_LABEL: Record<FontTheme, string> = {
  modern_sans: 'Modern Sans',
  farmhouse: 'Farmhouse',
  classic_serif: 'Classic Serif',
  minimal: 'Minimal',
  rustic: 'Rustic',
}

const HEX_RE = /^#[0-9a-f]{6}$/i

async function uploadPhoto(clientId: string, field: string, file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('field', field)
  const res = await fetch(`/api/admin/clients/${clientId}/branding/photo`, { method: 'POST', body: formData })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error ?? 'Upload failed')
  return data.url as string
}

export default function BrandingForm({ clientId, branding }: Props) {
  const router = useRouter()
  const [primaryColor, setPrimaryColor] = useState(branding?.primary_color ?? '#2563eb')
  const [secondaryColor, setSecondaryColor] = useState(branding?.secondary_color ?? '')
  const [accentColor, setAccentColor] = useState(branding?.accent_color ?? '')
  const [fontTheme, setFontTheme] = useState<FontTheme>(branding?.font_theme ?? 'modern_sans')
  const [appName, setAppName] = useState(branding?.app_name ?? '')
  const [tagline, setTagline] = useState(branding?.tagline ?? '')
  const [logoUrl, setLogoUrl] = useState(branding?.logo_url ?? '')
  const [appIconUrl, setAppIconUrl] = useState(branding?.app_icon_url ?? '')
  const [splashUrl, setSplashUrl] = useState(branding?.splash_url ?? '')
  const [heroPhotoUrls, setHeroPhotoUrls] = useState<string[]>(branding?.hero_photo_urls ?? [])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleUpload(field: string, setUrl: (url: string) => void, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      setUrl(await uploadPhoto(clientId, field, file))
    } catch (err: any) {
      setError(err.message ?? 'Upload failed')
    }
    setBusy(false)
  }

  async function handleHeroUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      const url = await uploadPhoto(clientId, 'hero', file)
      setHeroPhotoUrls(prev => [...prev, url])
    } catch (err: any) {
      setError(err.message ?? 'Upload failed')
    }
    setBusy(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (secondaryColor && !HEX_RE.test(secondaryColor)) return setError('Secondary color must be a hex value like #2563eb')
    if (accentColor && !HEX_RE.test(accentColor)) return setError('Accent color must be a hex value like #2563eb')
    if (appName.length > 30) return setError('App name must be 30 characters or fewer')
    if (tagline.length > 80) return setError('Tagline must be 80 characters or fewer')

    setBusy(true)
    setError(null)
    const res = await fetch(`/api/admin/clients/${clientId}/branding`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        primary_color: primaryColor,
        secondary_color: secondaryColor || null,
        accent_color: accentColor || null,
        font_theme: fontTheme,
        app_name: appName || null,
        tagline: tagline || null,
        logo_url: logoUrl || null,
        app_icon_url: appIconUrl || null,
        splash_url: splashUrl || null,
        hero_photo_urls: heroPhotoUrls,
      }),
    })
    const data = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) return setError(data.error ?? 'Save failed')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-5 space-y-5">
      {error && <div className="bg-red-50 text-red-700 text-sm rounded-lg p-3">{error}</div>}

      <div className="grid grid-cols-3 gap-3">
        <ColorField label="Primary" value={primaryColor} onChange={setPrimaryColor} required />
        <ColorField label="Secondary" value={secondaryColor} onChange={setSecondaryColor} />
        <ColorField label="Accent" value={accentColor} onChange={setAccentColor} />
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Font Theme</label>
        <select
          value={fontTheme}
          onChange={e => setFontTheme(e.target.value as FontTheme)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {Object.entries(FONT_THEME_LABEL).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">App Name</label>
        <input
          value={appName}
          maxLength={30}
          onChange={e => setAppName(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Tagline</label>
        <input
          value={tagline}
          maxLength={80}
          onChange={e => setTagline(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <ImageField label="Logo" url={logoUrl} onUpload={e => handleUpload('logo', setLogoUrl, e)} />
        <ImageField label="App Icon" url={appIconUrl} onUpload={e => handleUpload('app_icon', setAppIconUrl, e)} />
        <ImageField label="Splash" url={splashUrl} onUpload={e => handleUpload('splash', setSplashUrl, e)} />
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Hero Photos</label>
        <div className="grid grid-cols-3 gap-3 mb-2">
          {heroPhotoUrls.map((url, i) => (
            <div key={url} className="relative">
              <img src={url} alt="" className="w-full aspect-square object-cover rounded-lg border border-gray-200" />
              <button
                type="button"
                onClick={() => setHeroPhotoUrls(prev => prev.filter((_, j) => j !== i))}
                className="absolute top-1 right-1 bg-white/90 text-red-600 text-xs rounded-full w-5 h-5 flex items-center justify-center shadow"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <input type="file" accept="image/*" onChange={handleHeroUpload} className="text-sm" />
      </div>

      <button
        type="submit"
        disabled={busy}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
      >
        {busy ? 'Saving…' : 'Save Branding'}
      </button>
    </form>
  )
}

function ColorField({ label, value, onChange, required }: { label: string; value: string; onChange: (v: string) => void; required?: boolean }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</label>
      <div className="flex gap-2">
        <input
          type="color"
          value={value || '#000000'}
          onChange={e => onChange(e.target.value)}
          className="w-9 h-9 border border-gray-200 rounded-lg p-0.5 shrink-0"
        />
        <input
          value={value}
          required={required}
          placeholder="#2563eb"
          onChange={e => onChange(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  )
}

function ImageField({ label, url, onUpload }: { label: string; url: string; onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</label>
      {url && <img src={url} alt="" className="w-full aspect-square object-cover rounded-lg border border-gray-200 mb-2" />}
      <input type="file" accept="image/*" onChange={onUpload} className="text-xs w-full" />
    </div>
  )
}
