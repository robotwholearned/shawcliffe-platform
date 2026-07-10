'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useEnabledComponents } from '@/lib/use-enabled-components'

interface Property {
  id: string
  address: string | null
  gate_code: string | null
  parking_instructions: string | null
  pets_on_site: string | null
  access_notes: string | null
  preferred_service_day: string | null
  lawn_size: string | null
  snow_removal_areas: string | null
  cleaning_instructions: string | null
  safety_notes: string | null
  created_at: string
  customer: { name: string; phone: string | null; email: string | null } | null
}

export default function PropertiesPage() {
  const { has, loading: gateLoading } = useEnabledComponents()
  const [properties, setProperties] = useState<Property[] | null>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const pageSize = 25

  useEffect(() => {
    if (gateLoading || !has('property_profiles')) return
    const controller = new AbortController()
    setProperties(null)
    fetch(`/api/seller/properties?page=${page}`, { signal: controller.signal })
      .then(r => (r.ok ? r.json() : { properties: [], total: 0 }))
      .then(d => { setProperties(d.properties ?? []); setTotal(d.total ?? 0) })
      .catch(() => {})
    return () => controller.abort()
  }, [gateLoading, has, page])

  if (gateLoading) {
    return <div className="flex items-center justify-center min-h-screen"><p className="text-sm text-gray-400">Loading…</p></div>
  }

  if (!has('property_profiles')) {
    return (
      <div className="flex items-center justify-center min-h-screen px-6">
        <p className="text-sm text-gray-400 text-center">Property Profiles isn't enabled for your account.</p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4 pb-24">
      <header className="flex items-center gap-3 pt-2">
        <Link href="/seller" className="text-sm text-blue-600 hover:text-blue-700">← Back</Link>
        <h1 className="text-lg font-bold text-gray-900">Properties</h1>
      </header>

      <section className="bg-white rounded-2xl shadow-sm divide-y divide-gray-50">
        {properties === null && <p className="text-sm text-gray-400 py-8 text-center">Loading…</p>}
        {properties?.length === 0 && <p className="text-sm text-gray-400 py-8 text-center">No properties on file yet.</p>}
        {properties?.map(p => (
          <div key={p.id} className="px-4 py-3 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-gray-800 truncate">
                {p.address || 'Property'}
              </span>
              <span className="text-xs text-gray-400 flex-shrink-0">
                {new Date(p.created_at).toLocaleDateString()}
              </span>
            </div>
            {p.customer && (
              <div className="text-xs text-gray-500 flex flex-wrap gap-x-3">
                <span>{p.customer.name}</span>
                {p.customer.phone && <span>{p.customer.phone}</span>}
                {p.customer.email && <span>{p.customer.email}</span>}
              </div>
            )}
            {p.gate_code && <p className="text-xs text-gray-500">Gate code: {p.gate_code}</p>}
            {p.parking_instructions && <p className="text-xs text-gray-500">Parking: {p.parking_instructions}</p>}
            {p.access_notes && <p className="text-xs text-gray-500">Access: {p.access_notes}</p>}
            {p.pets_on_site && <p className="text-xs text-gray-500">Pets on site: {p.pets_on_site}</p>}
            {p.preferred_service_day && <p className="text-xs text-gray-500">Preferred day: {p.preferred_service_day}</p>}
            {p.lawn_size && <p className="text-xs text-gray-500">Lawn size: {p.lawn_size}</p>}
            {p.snow_removal_areas && <p className="text-xs text-gray-500">Snow removal: {p.snow_removal_areas}</p>}
            {p.cleaning_instructions && <p className="text-xs text-gray-500">Cleaning: {p.cleaning_instructions}</p>}
            {p.safety_notes && <p className="text-xs text-gray-500">Safety: {p.safety_notes}</p>}
          </div>
        ))}
      </section>

      {total > pageSize && (
        <div className="flex items-center justify-between text-sm">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="text-blue-600 disabled:text-gray-300"
          >
            ← Prev
          </button>
          <span className="text-xs text-gray-400">
            {page * pageSize + 1}–{Math.min((page + 1) * pageSize, total)} of {total}
          </span>
          <button
            onClick={() => setPage(p => ((p + 1) * pageSize < total ? p + 1 : p))}
            disabled={(page + 1) * pageSize >= total}
            className="text-blue-600 disabled:text-gray-300"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}
