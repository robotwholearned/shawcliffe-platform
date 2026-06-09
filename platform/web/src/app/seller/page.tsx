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
  const [clientId, setClientId] = useState<string | null | undefined>(undefined)
  const [todayStatus, setTodayStatus] = useState<DailyStatus | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const [broadcastMsg, setBroadcastMsg] = useState('')
  const [broadcasting, setBroadcasting] = useState(false)
  const [broadcastResult, setBroadcastResult] = useState<{ sent: number; failed: number } | null>(null)
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [newProductName, setNewProductName] = useState('')
  const [newProductPrice, setNewProductPrice] = useState('')
  const [addingProduct, setAddingProduct] = useState(false)

  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const cid: string | undefined =
        user.app_metadata?.client_id ?? user.user_metadata?.client_id
      if (!cid) { setClientId(null); return }
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

  const addProduct = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clientId || !newProductName.trim()) return
    setAddingProduct(true)
    const { data } = await supabase
      .from('products')
      .insert({
        client_id: clientId,
        name: newProductName.trim(),
        price: newProductPrice ? parseFloat(newProductPrice) : null,
        status: 'available',
        sort_order: products.length,
      })
      .select()
      .single()
    if (data) setProducts(prev => [...prev, data as Product])
    setNewProductName(''); setNewProductPrice(''); setShowAddProduct(false)
    setAddingProduct(false)
  }, [clientId, newProductName, newProductPrice, products.length])

  const deleteProduct = useCallback(async (productId: string) => {
    if (!clientId) return
    if (!confirm('Delete this product?')) return
    await supabase.from('products').delete().eq('client_id', clientId).eq('id', productId)
    setProducts(prev => prev.filter(p => p.id !== productId))
  }, [clientId])

  const sendBroadcast = useCallback(async () => {
    if (!broadcastMsg.trim()) return
    if (!confirm(`Send SMS to all opted-in customers?\n\n"${broadcastMsg}"`)) return
    setBroadcasting(true)
    setBroadcastResult(null)
    const res = await fetch('/api/broadcast/sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: broadcastMsg }),
    })
    const data = await res.json()
    setBroadcastResult(res.ok ? { sent: data.sent, failed: data.failed } : { sent: 0, failed: 1 })
    if (res.ok) setBroadcastMsg('')
    setBroadcasting(false)
  }, [broadcastMsg])

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
        <div className="text-center space-y-2">
          <p className="text-sm font-medium text-gray-700">No client assigned</p>
          <p className="text-xs text-gray-400">This account has no client_id in app_metadata. Ask your Shawcliffe admin to set it up.</p>
        </div>
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
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Products</h2>
          <button
            onClick={() => setShowAddProduct(v => !v)}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            {showAddProduct ? 'Cancel' : '+ Add'}
          </button>
        </div>

        {showAddProduct && (
          <form onSubmit={addProduct} className="flex gap-2 items-center">
            <input
              required
              value={newProductName}
              onChange={e => setNewProductName(e.target.value)}
              placeholder="Product name"
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="number"
              min="0"
              step="0.01"
              value={newProductPrice}
              onChange={e => setNewProductPrice(e.target.value)}
              placeholder="Price"
              className="w-20 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={addingProduct}
              className="bg-blue-600 text-white px-3 py-2 rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              Add
            </button>
          </form>
        )}

        {products.length === 0 && !showAddProduct && (
          <p className="text-sm text-gray-400 py-4 text-center">No products yet. Tap + Add to create one.</p>
        )}
        <div className="divide-y divide-gray-50">
          {products.map(p => (
            <div key={p.id} className="flex items-center justify-between py-2.5 gap-2">
              <div className="min-w-0">
                <span className="text-sm font-medium text-gray-800 truncate block">{p.name}</span>
                {p.price != null && <span className="text-xs text-gray-400">${p.price.toFixed(2)}</span>}
              </div>
              <div className="flex gap-1 flex-shrink-0 items-center">
                {(['available', 'low', 'sold_out'] as ProductStatus[]).map(s => (
                  <button
                    key={s}
                    onClick={() => setProductStatus(p.id, s)}
                    className={`text-xs px-2 py-1 rounded-lg transition-colors ${
                      p.status === s
                        ? s === 'available' ? 'bg-green-500 text-white'
                          : s === 'low' ? 'bg-yellow-400 text-white'
                          : 'bg-red-500 text-white'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {s === 'available' ? '✓' : s === 'low' ? 'Low' : 'Out'}
                  </button>
                ))}
                <button
                  onClick={() => deleteProduct(p.id)}
                  className="text-xs text-red-300 hover:text-red-500 ml-1"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SMS Broadcast */}
      <section className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Send Update to Customers</h2>
        <textarea
          value={broadcastMsg}
          onChange={e => { setBroadcastMsg(e.target.value); setBroadcastResult(null) }}
          placeholder="e.g. We're open today at the usual spot! Lots of strawberries left."
          rows={3}
          maxLength={160}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">{broadcastMsg.length}/160</span>
          {broadcastResult && (
            <span className={`text-xs font-medium ${broadcastResult.failed > 0 ? 'text-red-500' : 'text-green-600'}`}>
              {broadcastResult.failed > 0
                ? `${broadcastResult.failed} failed`
                : `Sent to ${broadcastResult.sent} customer${broadcastResult.sent !== 1 ? 's' : ''}`}
            </span>
          )}
        </div>
        <button
          onClick={sendBroadcast}
          disabled={broadcasting || !broadcastMsg.trim()}
          className="w-full bg-blue-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50"
        >
          {broadcasting ? 'Sending…' : 'Send SMS to All Customers'}
        </button>
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
