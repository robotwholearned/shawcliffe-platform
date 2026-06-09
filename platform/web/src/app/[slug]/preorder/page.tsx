import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import PreorderForm from './PreorderForm'
import type { Product } from '@/lib/supabase/types'

interface Props {
  params: { slug: string }
}

export default async function PreorderPage({ params }: Props) {
  const supabase = createServiceClient()
  const { data: client } = await supabase
    .from('clients')
    .select('id, business_name, active')
    .eq('slug', params.slug)
    .eq('active', true)
    .single()

  if (!client) notFound()

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
      initialProducts={(products ?? []) as Product[]}
    />
  )
}
