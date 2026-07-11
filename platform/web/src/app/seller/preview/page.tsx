'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import RealtimeStorefront from '@/components/RealtimeStorefront'
import type { ClientBranding, DailyStatusWithLocation, Product } from '@/lib/supabase/types'

// Read-only rendition of the customer storefront, scoped to this seller's own
// client_id — mirrors PreviewView.swift (ios-seller) / PreviewScreen.kt
// (android-seller). Reuses RealtimeStorefront for status/location/products
// instead of re-implementing that rendering, with the customer-only CTAs
// (signup/quote/booking/etc, absent from the native preview screens) hidden.
export default function PreviewPage() {
  const supabase = createClient()
  const [clientId, setClientId] = useState<string | null | undefined>(undefined)
  const [branding, setBranding] = useState<ClientBranding | null>(null)
  const [status, setStatus] = useState<DailyStatusWithLocation | null>(null)
  const [products, setProducts] = useState<Product[]>([])

  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      const cid: string | undefined = user?.app_metadata?.client_id ?? user?.user_metadata?.client_id
      if (!cid) { setClientId(null); return }
      setClientId(cid)

      const [brandingRes, statusRes, productsRes] = await Promise.all([
        supabase.from('client_branding').select('*').eq('client_id', cid).maybeSingle(),
        supabase.from('daily_status').select('*, locations(*)').eq('client_id', cid).eq('date', today).maybeSingle(),
        supabase.from('products').select('*').eq('client_id', cid).order('sort_order'),
      ])

      setBranding(brandingRes.data as ClientBranding | null)
      setStatus(statusRes.data as DailyStatusWithLocation | null)
      setProducts((productsRes.data ?? []) as Product[])
    }
    load()
  }, [today])

  if (clientId === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-sm text-gray-400">Loading…</p>
      </div>
    )
  }

  if (clientId === null) {
    return (
      <div className="flex items-center justify-center min-h-screen px-6">
        <p className="text-sm text-gray-400 text-center">No client assigned.</p>
      </div>
    )
  }

  return (
    <div
      className="p-4 space-y-5 pb-24"
      style={{ '--brand-primary': branding?.primary_color ?? '#2563eb' } as React.CSSProperties}
    >
      <header className="flex items-center gap-3 pt-2">
        <Link href="/seller" className="text-sm text-blue-600 hover:text-blue-700">← Back</Link>
        <h1 className="text-lg font-bold text-gray-900">Preview</h1>
      </header>
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 -mt-3">What customers see</p>

      <div className="flex items-center gap-3">
        {branding?.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={branding.logo_url}
            alt=""
            className="h-12 w-12 flex-shrink-0 rounded-xl bg-white object-contain p-1 shadow-sm"
          />
        ) : (
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--brand-primary,#2563eb)] text-lg font-bold text-white">
            {(branding?.app_name ?? 'S').charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-gray-900 truncate">{branding?.app_name ?? 'Your storefront'}</h2>
          {branding?.tagline && <p className="text-sm text-gray-500 truncate">{branding.tagline}</p>}
        </div>
      </div>

      <RealtimeStorefront
        clientId={clientId}
        slug=""
        showStatus
        showQuote={false}
        showBooking={false}
        showDocuments={false}
        initialStatus={status ? { status: status.status, custom_message: status.custom_message } : null}
        initialProducts={products}
        hours={status?.hours_open && status?.hours_close ? `${status.hours_open} – ${status.hours_close}` : null}
        location={status?.locations ? {
          displayName: status.locations.display_name,
          address: status.locations.address,
          mapUrl: status.locations.map_url,
          parkingNotes: status.locations.parking_notes,
        } : null}
        hideActions
      />
    </div>
  )
}
