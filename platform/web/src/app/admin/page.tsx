import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'
import { clientStatusLabel, clientStatusClass } from '@/lib/client-status'
import type { Client, Tier } from '@/lib/supabase/types'

const TIER_LABEL: Record<Tier, string> = {
  1: 'Starter',
  2: 'Seasonal',
  3: 'Local Seller App',
}

export const revalidate = 0

export default async function AdminDashboard() {
  const supabase = createServiceClient()
  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false })

  const rows = (clients ?? []) as Client[]
  const activeCount = rows.filter(c => c.active).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {activeCount} active · {rows.length} total
          </p>
        </div>
        <Link
          href="/admin/clients/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          + New Client
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {rows.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-gray-400 text-sm">No clients yet.</p>
            <Link href="/admin/clients/new" className="text-blue-600 text-sm mt-2 inline-block hover:underline">
              Create your first client →
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-400 uppercase tracking-wide">
                <th className="px-4 py-3 text-left">Business</th>
                <th className="px-4 py-3 text-left">Slug</th>
                <th className="px-4 py-3 text-left">Tier</th>
                <th className="px-4 py-3 text-left">Vertical</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Created</th>
                <th className="px-4 py-3 text-left"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    <Link href={`/admin/clients/${c.id}`} className="hover:text-blue-600 hover:underline">
                      {c.business_name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                      {c.slug}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{TIER_LABEL[c.tier]}</td>
                  <td className="px-4 py-3 text-gray-500 capitalize">{c.vertical.replaceAll('_', ' ')}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${clientStatusClass(c)}`}>
                      {clientStatusLabel(c)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {new Date(c.created_at).toLocaleDateString('en-CA')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3">
                      <Link href={`/admin/clients/${c.id}/products`} className="text-xs text-blue-600 hover:underline">
                        Products
                      </Link>
                      <Link href={`/admin/clients/${c.id}/toll-free`} className="text-xs text-blue-600 hover:underline">
                        Toll-Free SMS
                      </Link>
                      <Link href={`/admin/clients/${c.id}/custom-domain`} className="text-xs text-blue-600 hover:underline">
                        Domain
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
