import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { hasComponent } from '@/lib/components'
import BookingForm from './BookingForm'

interface Props {
  params: { slug: string }
}

// SSR on every request — enabled_components must reflect live admin toggles
export const revalidate = 0

export default async function BookingPage({ params }: Props) {
  const supabase = createServiceClient()
  const { data: client } = await supabase
    .from('clients')
    .select('id, business_name, active, enabled_components')
    .eq('slug', params.slug)
    .eq('active', true)
    .single()

  if (!client || !hasComponent(client.enabled_components, 'booking_request_system')) notFound()

  return (
    <BookingForm
      clientId={client.id}
      businessName={client.business_name}
      slug={params.slug}
      showPetFields={hasComponent(client.enabled_components, 'pet_profiles')}
    />
  )
}
