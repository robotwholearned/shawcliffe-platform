'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useEnabledComponents } from '@/lib/use-enabled-components'
import type { Pet as PetRow } from '@/lib/supabase/types'

type Pet = Omit<PetRow, 'client_id' | 'customer_id'> & {
  customer: { name: string; phone: string | null; email: string | null } | null
}

export default function PetsPage() {
  const { has, loading: gateLoading } = useEnabledComponents()
  const [pets, setPets] = useState<Pet[] | null>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const pageSize = 25

  useEffect(() => {
    if (gateLoading || !has('pet_profiles')) return
    const controller = new AbortController()
    setPets(null)
    fetch(`/api/seller/pets?page=${page}`, { signal: controller.signal })
      .then(r => (r.ok ? r.json() : { pets: [], total: 0 }))
      .then(d => { setPets(d.pets ?? []); setTotal(d.total ?? 0) })
      .catch(() => {})
    return () => controller.abort()
  }, [gateLoading, has, page])

  if (gateLoading) {
    return <div className="flex items-center justify-center min-h-screen"><p className="text-sm text-gray-400">Loading…</p></div>
  }

  if (!has('pet_profiles')) {
    return (
      <div className="flex items-center justify-center min-h-screen px-6">
        <p className="text-sm text-gray-400 text-center">Pet Profiles isn't enabled for your account.</p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4 pb-24">
      <header className="flex items-center gap-3 pt-2">
        <Link href="/seller" className="text-sm text-blue-600 hover:text-blue-700">← Back</Link>
        <h1 className="text-lg font-bold text-gray-900">Pets</h1>
      </header>

      <section className="bg-white rounded-2xl shadow-sm divide-y divide-gray-50">
        {pets === null && <p className="text-sm text-gray-400 py-8 text-center">Loading…</p>}
        {pets?.length === 0 && <p className="text-sm text-gray-400 py-8 text-center">No pets on file yet.</p>}
        {pets?.map(p => (
          <div key={p.id} className="px-4 py-3 space-y-1.5">
            <div className="flex items-center gap-3">
              {p.photo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.photo_url} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-gray-800 truncate">
                  {[p.name, p.breed].filter(Boolean).join(' — ') || 'Pet'}
                </span>
                <span className="text-xs text-gray-400 flex-shrink-0">
                  {new Date(p.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
            {p.customer && (
              <div className="text-xs text-gray-500 flex flex-wrap gap-x-3">
                <span>{p.customer.name}</span>
                {p.customer.phone && <span>{p.customer.phone}</span>}
                {p.customer.email && <span>{p.customer.email}</span>}
              </div>
            )}
            <div className="flex flex-wrap gap-1.5 text-xs text-gray-400">
              {p.size && <span className="px-1.5 py-0.5 bg-gray-100 rounded-full">{p.size}</span>}
              {p.age && <span className="px-1.5 py-0.5 bg-gray-100 rounded-full">{p.age}</span>}
              {p.allergies && <span className="px-1.5 py-0.5 bg-red-50 text-red-600 rounded-full">Allergies: {p.allergies}</span>}
            </div>
            {p.behavior_notes && <p className="text-sm text-gray-700">{p.behavior_notes}</p>}
            {p.grooming_preferences && <p className="text-xs text-gray-500">Grooming: {p.grooming_preferences}</p>}
            {p.vaccination_info && <p className="text-xs text-gray-500">Vaccinations: {p.vaccination_info}</p>}
            {p.emergency_contact && <p className="text-xs text-gray-500">Emergency contact: {p.emergency_contact}</p>}
            {p.care_instructions && <p className="text-xs text-gray-500">Care: {p.care_instructions}</p>}
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
