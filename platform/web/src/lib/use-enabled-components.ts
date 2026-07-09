'use client'

import { useEffect, useState } from 'react'
import type { ComponentKey } from './components'

// Seller-side read of the current client's enabled components.
// Tier 1 UI gates on this: `const { has } = useEnabledComponents()` then
// `has('inquiry_quote_form')`. Reads GET /api/seller/components (service-role
// backed — clients table is service_role_only). `loading` is true until the
// fetch resolves; gate rendering on it to avoid a flash of hidden UI.
export function useEnabledComponents() {
  const [enabled, setEnabled] = useState<string[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    fetch('/api/seller/components')
      .then((r) => (r.ok ? r.json() : { enabled_components: [] }))
      .then((d) => { if (active) setEnabled(d.enabled_components ?? []) })
      .catch(() => { if (active) setEnabled([]) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  return {
    enabled,
    loading,
    has: (key: ComponentKey) => !!enabled && enabled.includes(key),
  }
}
