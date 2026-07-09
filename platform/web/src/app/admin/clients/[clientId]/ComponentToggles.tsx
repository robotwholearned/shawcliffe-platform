'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { COMPONENT_KEYS, COMPONENT_LABELS, type ComponentKey } from '@/lib/components'

interface Props {
  clientId: string
  initial: string[]
}

export default function ComponentToggles({ clientId, initial }: Props) {
  const router = useRouter()
  const [enabled, setEnabled] = useState<Set<string>>(new Set(initial))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggle(key: ComponentKey) {
    setEnabled(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key); else next.add(key)
      return next
    })
    setSaved(false)
  }

  async function save() {
    setSaving(true)
    setError(null)
    const res = await fetch(`/api/admin/clients/${clientId}/components`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled_components: Array.from(enabled) }),
    })
    setSaving(false)
    if (res.ok) {
      setSaved(true)
      router.refresh()
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Failed to save')
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">Enabled Components</h2>
        <div className="flex items-center gap-3">
          {saved && <span className="text-xs text-green-600">Saved</span>}
          {error && <span className="text-xs text-red-500">{error}</span>}
          <button
            onClick={save}
            disabled={saving}
            className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {COMPONENT_KEYS.map(key => (
          <label key={key} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={enabled.has(key)}
              onChange={() => toggle(key)}
              className="rounded border-gray-300"
            />
            {COMPONENT_LABELS[key]}
          </label>
        ))}
      </div>
    </div>
  )
}
