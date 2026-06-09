'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import StatusBadge from './StatusBadge'
import ProductCard from './ProductCard'
import type { DailyStatusValue, Product } from '@/lib/supabase/types'

interface Props {
  clientId: string
  slug: string
  initialStatus: { status: DailyStatusValue; custom_message: string | null } | null
  initialProducts: Product[]
}

export default function RealtimeStorefront({ clientId, slug, initialStatus, initialProducts }: Props) {
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

  return (
    <div className="space-y-5">
      {!connected && (
        <p className="text-xs text-center text-gray-400">Live updates paused — checking every 5 seconds</p>
      )}

      <StatusBadge status={status?.status ?? null} customMessage={status?.custom_message} />

      {products.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Today's Products
          </h2>
          {products.map(p => (
            <ProductCard key={p.id} product={p} />
          ))}
        </section>
      )}

      {products.length === 0 && status?.status === 'open' && (
        <p className="text-sm text-gray-400 text-center py-8">No products listed yet.</p>
      )}

      <div className="pt-4 flex gap-3">
        <a
          href={`/${slug}/signup`}
          className="flex-1 text-center bg-[var(--brand-primary,#2563eb)] text-white rounded-xl py-3 text-sm font-semibold hover:opacity-90"
        >
          Get updates
        </a>
        <a
          href={`/${slug}/preorder`}
          className="flex-1 text-center bg-gray-100 text-gray-700 rounded-xl py-3 text-sm font-semibold hover:bg-gray-200"
        >
          Reserve an order
        </a>
      </div>
    </div>
  )
}
