'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { DailyStatus, Product, DailyStatusValue, ProductStatus } from '@/lib/supabase/types'

const STATUS_OPTIONS: { value: DailyStatusValue; label: string; emoji: string }[] = [
  { value: 'open',          label: 'Open',          emoji: '✓'  },
  { value: 'closed',        label: 'Closed',        emoji: '✕'  },
  { value: 'sold_out',      label: 'Sold Out',      emoji: '✕'  },
  { value: 'back_tomorrow', label: 'Back Tomorrow', emoji: '↺'  },
  { value: 'weather_delay', label: 'Weather Delay', emoji: '⛈' },
  { value: 'opening_soon',  label: 'Opening Soon',  emoji: '⏱' },
]

export default function SellerDashboard() {
  const supabase = createClient()
  const [clientId, setClientId] = useState<string | null>(null)
  const [todayStatus, setTodayStatus] = useState<DailyStatus | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<string | null>(null)

  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const cid: string | undefined =
        user.app_metadata?.client_id ?? user.user_metadata?.client_id
      if (!cid) return
      setClientId(cid)

      const [statusRes, productsRes] = await Promise.all([
        supabase.from('daily_status').select('*').eq('client_id', cid).eq('date', today).maybeSingle(),
        supabase.from('products').select('*').eq('client_id', cid).order('sort_order'),
      ])

      setTodayStatus(statusRes.data)
      setProducts(productsRes.data ?? [])
    }
    load()
  }, [today])

  const setStatus = useCallback(async (status: DailyStatusValue) => {
    if (!clientId) return
    setSaving(true)

    const now = new Date().toISOString()
    if (todayStatus) {
      await supabase
        .from('daily_status')
        .update({ status, updated_at: now })
        .eq('client_id', clientId)
        .eq('date', today)
    } else {
      const { data } = await supabase
        .from('daily_status')
        .insert({ client_id: clientId, date: today, status })
        .select()
        .single()
      if (data) setTodayStatus(data)
    }

    setTodayStatus(prev =>
      prev
        ? { ...prev, status, updated_at: now }
        : { client_id: clientId, id: '', date: today, status, hours_open: null, hours_close: null, location_id: null, custom_message: null, updated_at: now }
    )
    setLastSaved(new Date().toLocaleTimeString())
    setSaving(false)
  }, [clientId, todayStatus, today])

  const setProductStatus = useCallback(async (productId: string, status: ProductStatus) => {
    if (!clientId) return
    await supabase.from('products').update({ status }).eq('client_id', clientId).eq('id', productId)
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, status } : p))
  }, [clientId])

  const endOfDay = useCallback(async () => {
    if (!clientId) return
    if (!confirm('Mark all products Sold Out and status Closed?')) return
    setSaving(true)
    await Promise.all([
      setStatus('closed'),
      supabase.from('products').update({ status: 'sold_out' }).eq('client_id', clientId),
    ])
    setProducts(prev => prev.map(p => ({ ...p, status: 'sold_out' as ProductStatus })))
    setSaving(false)
  }, [clientId, setStatus])

  if (!clientId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-sm text-gray-400">Loading…</p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-5 pb-24">
      <header className="flex items-center justify-between pt-2">
        <h1 className="text-lg font-bold text-gray-900">Dashboard</h1>
        <div className="text-right">
          <p className="text-xs text-gray-400">{today}</p>
          {lastSaved && <p className="text-xs text-green-600">Saved {lastSaved}</p>}
        </div>
      </header>

      {/* Status */}
      <section className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Today's Status</h2>
        <div className="grid grid-cols-2 gap-2">
          {STATUS_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setStatus(opt.value)}
              disabled={saving}
              className={`rounded-xl px-3 py-3 text-sm font-medium transition-all active:scale-95 ${
                todayStatus?.status === opt.value
                  ? 'bg-[var(--brand-primary,#2563eb)] text-white shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span className="mr-1.5">{opt.emoji}</span>
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      {/* Products */}
      <section className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Products</h2>
        {products.length === 0 && (
          <p className="text-sm text-gray-400 py-4 text-center">No products yet.</p>
        )}
        <div className="divide-y divide-gray-50">
          {products.map(p => (
            <div key={p.id} className="flex items-center justify-between py-2.5">
              <span className="text-sm font-medium text-gray-800 truncate mr-3">{p.name}</span>
              <div className="flex gap-1 flex-shrink-0">
                {(['available', 'low', 'sold_out'] as ProductStatus[]).map(s => (
                  <button
                    key={s}
                    onClick={() => setProductStatus(p.id, s)}
                    className={`text-xs px-2 py-1 rounded-lg transition-colors ${
                      p.status === s
                        ? s === 'available'
                          ? 'bg-green-500 text-white'
                          : s === 'low'
                          ? 'bg-yellow-400 text-white'
                          : 'bg-red-500 text-white'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {s === 'available' ? '✓' : s === 'low' ? 'Low' : 'Out'}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* End of Day */}
      <button
        onClick={endOfDay}
        disabled={saving}
        className="w-full bg-red-50 text-red-600 rounded-2xl py-3.5 text-sm font-semibold hover:bg-red-100 active:scale-95 transition-all disabled:opacity-50"
      >
        End of Day — Mark All Sold Out
      </button>
    </div>
  )
}
