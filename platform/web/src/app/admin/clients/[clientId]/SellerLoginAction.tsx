'use client'

import { useState } from 'react'

interface Props {
  clientId: string
  defaultEmail: string
}

export default function SellerLoginAction({ clientId, defaultEmail }: Props) {
  const [email, setEmail] = useState(defaultEmail)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ email: string; password: string } | null>(null)

  async function handleCreate() {
    setCreating(true)
    setError(null)
    setResult(null)

    const res = await fetch(`/api/admin/clients/${clientId}/seller-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    const data = await res.json().catch(() => ({}))
    setCreating(false)

    if (res.ok) setResult({ email: data.email, password: data.password })
    else setError(data.error ?? 'Failed to create seller login')
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-5 space-y-3">
      <h2 className="text-sm font-semibold text-gray-700">Seller Dashboard Login</h2>

      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="seller@example.com"
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleCreate}
          disabled={creating || !email}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {creating ? 'Creating…' : 'Create Login'}
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {result && (
        <div className="bg-green-50 rounded-lg p-3 text-sm text-green-800 space-y-1">
          <p>✓ Login created — shown once, share it with the client now:</p>
          <p className="font-mono">{result.email}</p>
          <p className="font-mono">{result.password}</p>
        </div>
      )}
    </div>
  )
}
