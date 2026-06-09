'use client'

import { useState } from 'react'
import type { Product, ProductStatus } from '@/lib/supabase/types'

interface Props {
  clientId: string
  initialProducts: Product[]
}

const STATUS_STYLE: Record<ProductStatus, string> = {
  available: 'bg-green-100 text-green-700',
  low:       'bg-yellow-100 text-yellow-700',
  sold_out:  'bg-red-100 text-red-500',
}

export default function ProductsManager({ clientId, initialProducts }: Props) {
  const [products, setProducts] = useState<Product[]>(initialProducts)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Add product form state
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [newBundle, setNewBundle] = useState('')
  const [newLimit, setNewLimit] = useState('')

  async function addProduct(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const res = await fetch('/api/admin/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        name: newName,
        category: newCategory || null,
        price: newPrice ? parseFloat(newPrice) : null,
        bundle_description: newBundle || null,
        quantity_limit: newLimit ? parseInt(newLimit) : null,
        sort_order: products.length,
      }),
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok) { setError(data.error ?? 'Failed to add product'); setSaving(false); return }

    setProducts(prev => [...prev, data.product])
    setNewName(''); setNewCategory(''); setNewPrice(''); setNewBundle(''); setNewLimit('')
    setShowAdd(false)
    setSaving(false)
  }

  async function updateStatus(productId: string, status: ProductStatus) {
    const res = await fetch(`/api/admin/products/${productId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId, status }),
    })
    if (res.ok) setProducts(prev => prev.map(p => p.id === productId ? { ...p, status } : p))
  }

  async function deleteProduct(productId: string) {
    if (!confirm('Delete this product?')) return
    const res = await fetch(`/api/admin/products/${productId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId }),
    })
    if (res.ok) setProducts(prev => prev.filter(p => p.id !== productId))
  }

  return (
    <div className="space-y-4">
      {/* Product list */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {products.length === 0 && !showAdd ? (
          <div className="py-12 text-center">
            <p className="text-gray-400 text-sm">No products yet.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-400 uppercase tracking-wide">
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Category</th>
                <th className="px-4 py-3 text-left">Price</th>
                <th className="px-4 py-3 text-left">Cap</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {products.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {p.name}
                    {p.bundle_description && (
                      <p className="text-xs text-gray-400 font-normal">{p.bundle_description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{p.category ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{p.price != null ? `$${p.price.toFixed(2)}` : '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{p.quantity_limit ?? '—'}</td>
                  <td className="px-4 py-3">
                    <select
                      value={p.status}
                      onChange={e => updateStatus(p.id, e.target.value as ProductStatus)}
                      className={`text-xs px-2 py-1 rounded-full font-medium border-0 cursor-pointer ${STATUS_STYLE[p.status]}`}
                    >
                      <option value="available">Available</option>
                      <option value="low">Low Stock</option>
                      <option value="sold_out">Sold Out</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => deleteProduct(p.id)}
                      className="text-xs text-red-400 hover:text-red-600"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add product form */}
      {showAdd ? (
        <form onSubmit={addProduct} className="bg-white rounded-xl shadow-sm p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">Add Product</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <input
                required
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Product name *"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <input
              value={newCategory}
              onChange={e => setNewCategory(e.target.value)}
              placeholder="Category"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="number"
              min="0"
              step="0.01"
              value={newPrice}
              onChange={e => setNewPrice(e.target.value)}
              placeholder="Price (e.g. 5.00)"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              value={newBundle}
              onChange={e => setNewBundle(e.target.value)}
              placeholder="Bundle description (e.g. 3 for $10)"
              className="col-span-2 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="number"
              min="1"
              value={newLimit}
              onChange={e => setNewLimit(e.target.value)}
              placeholder="Preorder cap (optional)"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Adding…' : 'Add Product'}
            </button>
            <button
              type="button"
              onClick={() => { setShowAdd(false); setError(null) }}
              className="text-sm text-gray-500 hover:text-gray-800 px-3"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setShowAdd(true)}
          className="w-full border-2 border-dashed border-gray-200 rounded-xl py-3 text-sm text-gray-400 hover:border-blue-300 hover:text-blue-500 transition-colors"
        >
          + Add Product
        </button>
      )}
    </div>
  )
}
