import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import TollFreeWizard from './TollFreeWizard'
import type { Client, TwilioSubaccount } from '@/lib/supabase/types'

interface Props {
  params: { clientId: string }
}

export const revalidate = 0

export default async function TollFreePage({ params }: Props) {
  const supabase = createServiceClient()
  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('id', params.clientId)
    .single()

  if (!client) notFound()

  const { data: subaccount } = await supabase
    .from('twilio_subaccounts')
    .select('*')
    .eq('client_id', params.clientId)
    .maybeSingle()

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href={`/admin/clients/${params.clientId}`} className="text-sm text-gray-400 hover:text-gray-600">
          ← {(client as Client).business_name}
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">Toll-Free SMS Verification</h1>
        <p className="text-sm text-gray-500 mt-1">
          Buys a Canadian toll-free number in this client's own Twilio subaccount and submits it for Twilio's
          Toll-Free Verification, so SMS isn't filtered by Rogers/Bell/Telus.
        </p>
      </div>

      <TollFreeWizard clientId={params.clientId} businessName={(client as Client).business_name} subaccount={subaccount as TwilioSubaccount | null} />
    </div>
  )
}
