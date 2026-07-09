import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import BrandingForm from './BrandingForm'
import type { Client, ClientBranding } from '@/lib/supabase/types'

interface Props {
  params: { clientId: string }
}

export const revalidate = 0

export default async function BrandingPage({ params }: Props) {
  const supabase = createServiceClient()
  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('id', params.clientId)
    .single()

  if (!client) notFound()

  const { data: branding } = await supabase
    .from('client_branding')
    .select('*')
    .eq('client_id', params.clientId)
    .single()

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href={`/admin/clients/${params.clientId}`} className="text-sm text-gray-400 hover:text-gray-600">
          ← {(client as Client).business_name}
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">Branding</h1>
        <p className="text-sm text-gray-500 mt-1">
          Visual identity for the storefront and native apps — colors, font theme, logo, and hero photos.
        </p>
      </div>

      <BrandingForm clientId={params.clientId} branding={branding as ClientBranding | null} />
    </div>
  )
}
