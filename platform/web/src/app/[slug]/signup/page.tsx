import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import SignupForm from './SignupForm'

interface Props {
  params: { slug: string }
}

export default async function SignupPage({ params }: Props) {
  const supabase = createServiceClient()
  const { data: client } = await supabase
    .from('clients')
    .select('id, business_name, active')
    .eq('slug', params.slug)
    .eq('active', true)
    .single()

  if (!client) notFound()

  return <SignupForm clientId={client.id} businessName={client.business_name} slug={params.slug} />
}
