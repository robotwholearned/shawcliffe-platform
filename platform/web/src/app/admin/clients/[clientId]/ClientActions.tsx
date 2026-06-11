'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  clientId: string
  businessName: string
  isActive: boolean
}

export default function ClientActions({ clientId, businessName, isActive }: Props) {
  const router = useRouter()
  const [suspending, setSuspending] = useState(false)
  const [deprovisioning, setDeprovisioning] = useState(false)
  const [log, setLog] = useState<string[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [done, setDone] = useState(false)

  async function handleSuspend() {
    if (!confirm(`Suspend ${businessName}?\n\nThe storefront will show "not available". Data is retained and can be reactivated.`)) return
    setSuspending(true)
    const res = await fetch(`/api/admin/clients/${clientId}/suspend`, { method: 'POST' })
    setSuspending(false)
    if (res.ok) router.refresh()
    else {
      const data = await res.json().catch(() => ({}))
      alert(data.error ?? 'Suspend failed')
    }
  }

  async function handleDeprovision() {
    const confirm1 = confirm(`⚠️ PERMANENTLY delete ${businessName}?\n\nThis will:\n• Delete all customers, preorders, products\n• Delete all Storage assets\n• Delete seller Auth accounts\n• Suspend Twilio subaccount\n\nThis CANNOT be undone.`)
    if (!confirm1) return

    const confirmText = window.prompt(`Type the client ID to confirm:\n\n${clientId}`)
    if (confirmText !== clientId) { alert('ID did not match. Cancelled.'); return }

    setDeprovisioning(true)
    setLog([])
    setErrors([])

    const res = await fetch(`/api/admin/clients/${clientId}/deprovision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: clientId }),
    })

    const data = await res.json().catch(() => ({}))
    setLog(data.log ?? [])
    setErrors(data.errors ?? [])
    setDeprovisioning(false)

    if (res.ok && data.ok) {
      setDone(true)
      setTimeout(() => router.push('/admin'), 2000)
    }
  }

  if (done) {
    return (
      <div className="bg-green-50 rounded-xl p-4 text-sm text-green-700">
        ✓ {businessName} fully de-provisioned. Redirecting…
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-sm p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">Account Actions</h2>

        <div className="flex gap-3">
          <button
            onClick={handleSuspend}
            disabled={suspending || !isActive}
            className="bg-yellow-50 text-yellow-700 border border-yellow-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-yellow-100 disabled:opacity-50"
          >
            {suspending ? 'Suspending…' : isActive ? 'Suspend Account' : 'Account Suspended'}
          </button>

          <button
            onClick={handleDeprovision}
            disabled={deprovisioning}
            className="bg-red-50 text-red-700 border border-red-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-100 disabled:opacity-50"
          >
            {deprovisioning ? 'De-provisioning…' : 'De-provision (Delete All Data)'}
          </button>
        </div>

        {log.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-3 space-y-1">
            {log.map((l, i) => (
              <p key={i} className="text-xs text-gray-600 font-mono">✓ {l}</p>
            ))}
            {errors.map((e, i) => (
              <p key={i} className="text-xs text-red-600 font-mono">✕ {e}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
