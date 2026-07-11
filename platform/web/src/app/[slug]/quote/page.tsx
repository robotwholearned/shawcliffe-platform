import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { hasComponent } from '@/lib/components'
import QuoteForm from './QuoteForm'

interface Props {
  params: { slug: string }
}

// SSR on every request — enabled_components must reflect live admin toggles
export const revalidate = 0

export default async function QuotePage({ params }: Props) {
  const supabase = createServiceClient()
  const { data: client } = await supabase
    .from('clients')
    .select('id, business_name, active, enabled_components')
    .eq('slug', params.slug)
    .eq('active', true)
    .single()

  if (!client || !hasComponent(client.enabled_components, 'inquiry_quote_form')) notFound()

  return (
    <QuoteForm
      clientId={client.id}
      businessName={client.business_name}
      slug={params.slug}
      showVehicleFields={hasComponent(client.enabled_components, 'vehicle_profiles')}
      showPropertyFields={hasComponent(client.enabled_components, 'property_profiles')}
      showPhotoUpload={hasComponent(client.enabled_components, 'photo_file_upload')}
    />
  )
}
