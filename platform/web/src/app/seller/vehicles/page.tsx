'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useEnabledComponents } from '@/lib/use-enabled-components'

interface Vehicle {
  id: string
  make: string | null
  model: string | null
  year: number | null
  vin: string | null
  plate: string | null
  mileage: number | null
  notes: string | null
  created_at: string
  customer: { name: string; phone: string | null; email: string | null } | null
}

export default function VehiclesPage() {
  const { has, loading: gateLoading } = useEnabledComponents()
  const [vehicles, setVehicles] = useState<Vehicle[] | null>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const pageSize = 25

  useEffect(() => {
    if (gateLoading || !has('vehicle_profiles')) return
    const controller = new AbortController()
    setVehicles(null)
    fetch(`/api/seller/vehicles?page=${page}`, { signal: controller.signal })
      .then(r => (r.ok ? r.json() : { vehicles: [], total: 0 }))
      .then(d => { setVehicles(d.vehicles ?? []); setTotal(d.total ?? 0) })
      .catch(() => {})
    return () => controller.abort()
  }, [gateLoading, has, page])

  if (gateLoading) {
    return <div className="flex items-center justify-center min-h-screen"><p className="text-sm text-gray-400">Loading…</p></div>
  }

  if (!has('vehicle_profiles')) {
    return (
      <div className="flex items-center justify-center min-h-screen px-6">
        <p className="text-sm text-gray-400 text-center">Vehicle Profiles isn't enabled for your account.</p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4 pb-24">
      <header className="flex items-center gap-3 pt-2">
        <Link href="/seller" className="text-sm text-blue-600 hover:text-blue-700">← Back</Link>
        <h1 className="text-lg font-bold text-gray-900">Vehicles</h1>
      </header>

      <section className="bg-white rounded-2xl shadow-sm divide-y divide-gray-50">
        {vehicles === null && <p className="text-sm text-gray-400 py-8 text-center">Loading…</p>}
        {vehicles?.length === 0 && <p className="text-sm text-gray-400 py-8 text-center">No vehicles on file yet.</p>}
        {vehicles?.map(v => (
          <div key={v.id} className="px-4 py-3 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-gray-800 truncate">
                {[v.year, v.make, v.model].filter(Boolean).join(' ') || 'Vehicle'}
              </span>
              <span className="text-xs text-gray-400 flex-shrink-0">
                {new Date(v.created_at).toLocaleDateString()}
              </span>
            </div>
            {v.customer && (
              <div className="text-xs text-gray-500 flex flex-wrap gap-x-3">
                <span>{v.customer.name}</span>
                {v.customer.phone && <span>{v.customer.phone}</span>}
                {v.customer.email && <span>{v.customer.email}</span>}
              </div>
            )}
            <div className="flex flex-wrap gap-1.5 text-xs text-gray-400">
              {v.plate && <span className="px-1.5 py-0.5 bg-gray-100 rounded-full">Plate {v.plate}</span>}
              {v.vin && <span className="px-1.5 py-0.5 bg-gray-100 rounded-full">VIN {v.vin}</span>}
              {v.mileage != null && <span className="px-1.5 py-0.5 bg-gray-100 rounded-full">{v.mileage.toLocaleString()} mi</span>}
            </div>
            {v.notes && <p className="text-sm text-gray-700">{v.notes}</p>}
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
