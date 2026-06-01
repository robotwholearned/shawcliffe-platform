'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function NewClientPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const form = new FormData(e.currentTarget)
    const payload = {
      slug:           (form.get('slug') as string).toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, ''),
      business_name:  form.get('business_name') as string,
      vertical:       form.get('vertical') as string,
      tier:           Number(form.get('tier')),
      operator_email: form.get('operator_email') as string,
      operator_phone: (form.get('operator_phone') as string) || null,
      primary_color:  form.get('primary_color') as string,
      app_name:       (form.get('app_name') as string) || null,
      tagline:        (form.get('tagline') as string) || null,
    }

    const res = await fetch('/api/admin/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Failed to create client')
      setSaving(false)
      return
    }

    router.push('/admin')
    router.refresh()
  }

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">New Client</h1>
        <p className="text-sm text-gray-400 mt-1">Provisions a subdomain and branding record.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 space-y-5">
        <Field label="Business Name" name="business_name" required placeholder="Tom's Produce" />
        <Field
          label="Slug"
          name="slug"
          required
          placeholder="toms-produce"
          hint="URL: toms-produce.shawcliffe.ca  •  URL-safe, lowercase, hyphens only"
        />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vertical <span className="text-red-500">*</span>
            </label>
            <select
              name="vertical"
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="produce_seller">Produce Seller</option>
              <option value="baker">Baker</option>
              <option value="cleaner">Cleaner</option>
              <option value="welder">Welder</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tier <span className="text-red-500">*</span>
            </label>
            <select
              name="tier"
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="1">1 — Starter</option>
              <option value="2">2 — Seasonal</option>
              <option value="3">3 — Local Seller App</option>
            </select>
          </div>
        </div>

        <Field label="Operator Email" name="operator_email" type="email" required />
        <Field label="Operator Phone" name="operator_phone" type="tel" placeholder="(289) 555-0100" />
        <Field label="App Name" name="app_name" placeholder="Tom's Produce" hint="≤ 30 characters. Shown in the app and browser tab." />
        <Field label="Tagline" name="tagline" placeholder="Fresh from the farm, every Tuesday" hint="≤ 80 characters" />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Brand Colour</label>
          <div className="flex items-center gap-3">
            <input
              name="primary_color"
              type="color"
              defaultValue="#2563eb"
              className="h-10 w-16 rounded-lg border border-gray-200 cursor-pointer p-1"
            />
            <span className="text-xs text-gray-400">Primary brand colour</span>
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Creating…' : 'Create Client'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="text-sm text-gray-500 hover:text-gray-800"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

function Field({
  label, name, type = 'text', required = false, placeholder, hint,
}: {
  label: string
  name: string
  type?: string
  required?: boolean
  placeholder?: string
  hint?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  )
}
