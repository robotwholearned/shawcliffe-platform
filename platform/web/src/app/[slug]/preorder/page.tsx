import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import PreorderForm from './PreorderForm'
import type { Product } from '@/lib/supabase/types'

interface Props {
  params: { slug: string }
}

// SSR on every request — client active/enabled state and product list must reflect live admin changes
export const revalidate = 0

export default async function PreorderPage({ params }: Props) {
  const supabase = createServiceClient()
  const { data: client } = await supabase
    .from('clients')
    .select('id, business_name, active, client_branding(primary_color, logo_url, tagline, hero_photo_urls)')
    .eq('slug', params.slug)
    .eq('active', true)
    .single()

  if (!client) notFound()

  const branding = (client as any).client_branding as { primary_color: string | null; logo_url: string | null; tagline: string | null; hero_photo_urls: string[] | null } | null

  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('client_id', client.id)
    .neq('status', 'sold_out')
    .order('sort_order')

  return (
    <PreorderForm
      clientId={client.id}
      businessName={client.business_name}
      slug={params.slug}
      logoUrl={branding?.logo_url ?? null}
      tagline={branding?.tagline ?? null}
      primaryColor={branding?.primary_color ?? null}
      heroUrl={branding?.hero_photo_urls?.[0] ?? null}
      initialProducts={(products ?? []) as Product[]}
    />
  )
}
