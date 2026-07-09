import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { clientStatusLabel, clientStatusClass } from '@/lib/client-status'
import ClientActions from './ClientActions'
import ComponentToggles from './ComponentToggles'
import type { Client } from '@/lib/supabase/types'

interface Props {
  params: { clientId: string }
}

export const revalidate = 0

export default async function ClientDetailPage({ params }: Props) {
  const supabase = createServiceClient()
  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('id', params.clientId)
    .single()

  if (!client) notFound()
  const c = client as Client

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/admin" className="text-sm text-gray-400 hover:text-gray-600">← Clients</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">{c.business_name}</h1>
        <p className="text-sm text-gray-400 font-mono">{c.slug}</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-5 grid grid-cols-2 gap-4 text-sm">
        <div><p className="text-xs text-gray-400 mb-0.5">Status</p>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${clientStatusClass(c)}`}>
            {clientStatusLabel(c)}
          </span>
        </div>
        <div><p className="text-xs text-gray-400 mb-0.5">Tier</p><p className="font-medium">{c.tier}</p></div>
        <div><p className="text-xs text-gray-400 mb-0.5">Vertical</p><p className="font-medium capitalize">{c.vertical.replaceAll('_', ' ')}</p></div>
        <div><p className="text-xs text-gray-400 mb-0.5">Email</p><p className="font-medium">{c.operator_email}</p></div>
        <div><p className="text-xs text-gray-400 mb-0.5">Phone</p><p className="font-medium">{c.operator_phone ?? '—'}</p></div>
        <div><p className="text-xs text-gray-400 mb-0.5">Created</p><p className="font-medium">{new Date(c.created_at).toLocaleDateString('en-CA')}</p></div>
      </div>

      <div className="flex gap-3">
        <Link
          href={`/admin/clients/${c.id}/products`}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          Manage Products
        </Link>
        <a
          href={`/${c.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200"
        >
          View Storefront →
        </a>
        <Link
          href={`/admin/clients/${c.id}/toll-free`}
          className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200"
        >
          Toll-Free SMS Verification
        </Link>
        <Link
          href={`/admin/clients/${c.id}/custom-domain`}
          className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200"
        >
          Custom Domain
        </Link>
      </div>

      <ComponentToggles clientId={c.id} initial={c.enabled_components ?? []} />

      <ClientActions clientId={c.id} businessName={c.business_name} isActive={c.active} isPaused={c.paused} />
    </div>
  )
}
