'use client'

import { useState } from 'react'
import type { DocumentChecklistItem } from '@/lib/supabase/types'

interface Props {
  clientId: string
  initialItems: DocumentChecklistItem[]
}

export default function DocumentChecklistManager({ clientId, initialItems }: Props) {
  const [items, setItems] = useState<DocumentChecklistItem[]>(initialItems)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [showAdd, setShowAdd] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newRequired, setNewRequired] = useState(true)
  const [newNeedsUpload, setNewNeedsUpload] = useState(true)

  async function addItem(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const res = await fetch('/api/admin/document-checklist-items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        title: newTitle,
        description: newDescription || null,
        required: newRequired,
        needs_upload: newNeedsUpload,
        sort_order: items.length,
      }),
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok) { setError(data.error ?? 'Failed to add item'); setSaving(false); return }

    setItems(prev => [...prev, data.item])
    setNewTitle(''); setNewDescription(''); setNewRequired(true); setNewNeedsUpload(true)
    setShowAdd(false)
    setSaving(false)
  }

  async function toggleField(itemId: string, field: 'required' | 'needs_upload', value: boolean) {
    const res = await fetch(`/api/admin/document-checklist-items/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId, [field]: value }),
    })
    if (res.ok) setItems(prev => prev.map(i => i.id === itemId ? { ...i, [field]: value } : i))
  }

  async function deleteItem(itemId: string) {
    if (!confirm('Delete this checklist item?')) return
    const res = await fetch(`/api/admin/document-checklist-items/${itemId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId }),
    })
    if (res.ok) setItems(prev => prev.filter(i => i.id !== itemId))
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {items.length === 0 && !showAdd ? (
          <div className="py-12 text-center">
            <p className="text-gray-400 text-sm">No checklist items yet.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-400 uppercase tracking-wide">
                <th className="px-4 py-3 text-left">Title</th>
                <th className="px-4 py-3 text-left">Required</th>
                <th className="px-4 py-3 text-left">Needs Upload</th>
                <th className="px-4 py-3 text-left"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map(i => (
                <tr key={i.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {i.title}
                    {i.description && (
                      <p className="text-xs text-gray-400 font-normal">{i.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={i.required}
                      onChange={e => toggleField(i.id, 'required', e.target.checked)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={i.needs_upload}
                      onChange={e => toggleField(i.id, 'needs_upload', e.target.checked)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => deleteItem(i.id)}
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

      {showAdd ? (
        <form onSubmit={addItem} className="bg-white rounded-xl shadow-sm p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">Add Checklist Item</h3>
          <input
            required
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            placeholder="Title (e.g. Signed intake form) *"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            value={newDescription}
            onChange={e => setNewDescription(e.target.value)}
            placeholder="Instructions (optional)"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex gap-4 text-sm text-gray-600">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={newRequired} onChange={e => setNewRequired(e.target.checked)} />
              Required
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={newNeedsUpload} onChange={e => setNewNeedsUpload(e.target.checked)} />
              Needs upload (vs. bring-with-you reminder)
            </label>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Adding…' : 'Add Item'}
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
          + Add Checklist Item
        </button>
      )}
    </div>
  )
}
