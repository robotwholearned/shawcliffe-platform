'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import StatusBadge from './StatusBadge'
import ProductCard from './ProductCard'
import type { DailyStatusValue, Product } from '@/lib/supabase/types'

interface LocationInfo {
  displayName: string
  address: string | null
  mapUrl: string | null
  parkingNotes: string | null
}

interface Props {
  clientId: string
  slug: string
  showStatus: boolean
  showQuote: boolean
  showBooking: boolean
  showDocuments: boolean
  initialStatus: { status: DailyStatusValue; custom_message: string | null } | null
  initialProducts: Product[]
  hours?: string | null
  location?: LocationInfo | null
  // Seller preview reuses this component for status/location/products but
  // isn't a real customer session — hide the signup/quote/booking/etc CTAs.
  hideActions?: boolean
}

export default function RealtimeStorefront({ clientId, slug, showStatus, showQuote, showBooking, showDocuments, initialStatus, initialProducts, hours, location, hideActions = false }: Props) {
  const [status, setStatus] = useState(initialStatus)
  const [products, setProducts] = useState(initialProducts)
  const [connected, setConnected] = useState(true)
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const supabase = createClient()
    const today = new Date().toISOString().split('T')[0]

    async function pollStatus() {
      const { data } = await supabase
        .from('daily_status')
        .select('status, custom_message')
        .eq('client_id', clientId)
        .eq('date', today)
        .maybeSingle()
      if (data) setStatus(data as { status: DailyStatusValue; custom_message: string | null })
    }

    async function pollProducts() {
      const { data } = await supabase
        .from('products')
        .select('*')
        .eq('client_id', clientId)
        .order('sort_order')
      if (data) setProducts(data as Product[])
    }

    function startPolling() {
      setConnected(false)
      pollRef.current = setInterval(() => {
        pollStatus()
        pollProducts()
      }, 5000)
    }

    const statusChannel = supabase
      .channel(`tenant:${clientId}:status`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'daily_status', filter: `client_id=eq.${clientId}` },
        (payload) => {
          const row = payload.new as { status: DailyStatusValue; custom_message: string | null }
          setStatus({ status: row.status, custom_message: row.custom_message })
        }
      )
      .subscribe((s) => {
        if (s === 'SUBSCRIBED') { setConnected(true); if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null } }
        if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT') startPolling()
      })

    const productsChannel = supabase
      .channel(`tenant:${clientId}:products`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products', filter: `client_id=eq.${clientId}` },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            setProducts(prev => prev.filter(p => p.id !== payload.old.id))
          } else {
            const updated = payload.new as Product
            setProducts(prev => {
              const idx = prev.findIndex(p => p.id === updated.id)
              return idx >= 0
                ? prev.map(p => p.id === updated.id ? updated : p)
                : [...prev, updated].sort((a, b) => a.sort_order - b.sort_order)
            })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(statusChannel)
      supabase.removeChannel(productsChannel)
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [clientId])

  const showCard = showStatus || !!location || !!hours

  return (
    <div className="space-y-6">
      {showCard && (
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-900/5">
          <div className="flex items-start justify-between gap-3">
            {showStatus ? (
              <StatusBadge status={status?.status ?? null} customMessage={status?.custom_message} />
            ) : (
              location && <p className="text-[15px] font-semibold text-gray-900">{location.displayName}</p>
            )}
            {hours && (
              <span className="flex-shrink-0 pt-0.5 text-xs font-medium tabular-nums text-gray-500">
                {hours}
              </span>
            )}
          </div>

          {location && (
            <div className={`space-y-1 ${showStatus ? 'mt-4 border-t border-gray-100 pt-3.5' : 'mt-2'}`}>
              {showStatus && (
                <p className="text-sm font-semibold text-gray-900">{location.displayName}</p>
              )}
              {location.address && (
                <a
                  href={
                    location.mapUrl ??
                    `https://maps.google.com/?q=${encodeURIComponent(location.address)}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm font-medium text-[var(--brand-primary,#2563eb)] hover:underline"
                >
                  {location.address}
                  <span aria-hidden>→</span>
                </a>
              )}
              {location.parkingNotes && (
                <p className="text-xs text-gray-400">{location.parkingNotes}</p>
              )}
            </div>
          )}
        </div>
      )}

      {!connected && (
        <p className="text-center text-xs text-gray-400">
          Live updates paused — refreshing every 5 seconds
        </p>
      )}

      {products.length > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">
              Today&rsquo;s Products
            </h2>
            <div className="h-px flex-1 bg-gray-200" aria-hidden />
          </div>
          <div className="divide-y divide-gray-100 rounded-2xl bg-white shadow-sm ring-1 ring-gray-900/5">
            {products.map(p => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {products.length === 0 && status?.status === 'open' && (
        <p className="py-8 text-center text-sm text-gray-400">No products listed yet.</p>
      )}

      {!hideActions && (
      <div className="space-y-3 pt-2">
        <a
          href={`/${slug}/signup`}
          className="block w-full rounded-xl bg-[var(--brand-primary,#2563eb)] py-3.5 text-center text-sm font-semibold text-white shadow-sm transition hover:brightness-110 active:scale-[0.99]"
        >
          Get updates
        </a>
        <a
          href={`/${slug}/preorder`}
          className="block text-center text-sm font-semibold text-[var(--brand-primary,#2563eb)] hover:underline"
        >
          Reserve an order <span aria-hidden>→</span>
        </a>
        {showQuote && (
          <a
            href={`/${slug}/quote`}
            className="block text-center text-sm font-semibold text-[var(--brand-primary,#2563eb)] hover:underline"
          >
            Get a quote <span aria-hidden>→</span>
          </a>
        )}
        {showBooking && (
          <a
            href={`/${slug}/booking`}
            className="block text-center text-sm font-semibold text-[var(--brand-primary,#2563eb)] hover:underline"
          >
            Request a booking <span aria-hidden>→</span>
          </a>
        )}
        {showDocuments && (
          <a
            href={`/${slug}/documents`}
            className="block text-center text-sm font-semibold text-[var(--brand-primary,#2563eb)] hover:underline"
          >
            Submit documents <span aria-hidden>→</span>
          </a>
        )}
      </div>
      )}
    </div>
  )
}
