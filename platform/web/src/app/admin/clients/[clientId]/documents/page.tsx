import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import DocumentChecklistManager from './DocumentChecklistManager'
import type { DocumentChecklistItem } from '@/lib/supabase/types'

interface Props {
  params: { clientId: string }
}

export const revalidate = 0

export default async function DocumentChecklistPage({ params }: Props) {
  const supabase = createServiceClient()

  const { data: client } = await supabase
    .from('clients')
    .select('id, business_name, slug')
    .eq('id', params.clientId)
    .single()

  if (!client) notFound()

  const { data: items } = await supabase
    .from('document_checklist_items')
    .select('*')
    .eq('client_id', params.clientId)
    .order('sort_order')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin" className="text-sm text-gray-400 hover:text-gray-600">
            ← Clients
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">{client.business_name}</h1>
          <p className="text-sm text-gray-400">Document Checklist · <span className="font-mono">{client.slug}</span></p>
        </div>
        <a
          href={`/${client.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-600 hover:underline"
        >
          View storefront →
        </a>
      </div>

      <DocumentChecklistManager
        clientId={params.clientId}
        initialItems={(items ?? []) as DocumentChecklistItem[]}
      />
    </div>
  )
}
