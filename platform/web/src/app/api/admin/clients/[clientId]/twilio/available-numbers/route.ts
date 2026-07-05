import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import twilio from 'twilio'

export async function GET(req: NextRequest, { params }: { params: { clientId: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user?.app_metadata?.role !== 'shawcliffe_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createServiceClient()

  const { data: twilioAccount } = await admin
    .from('twilio_subaccounts')
    .select('account_sid, auth_token')
    .eq('client_id', params.clientId)
    .single()

  if (!twilioAccount) {
    return NextResponse.json({ error: 'No Twilio subaccount for this client yet' }, { status: 404 })
  }

  const client = twilio(twilioAccount.account_sid, twilioAccount.auth_token)

  try {
    const numbers = await client.availablePhoneNumbers('CA').tollFree.list({ limit: 10 })
    return NextResponse.json({
      numbers: numbers.map(n => ({
        phoneNumber: n.phoneNumber,
        friendlyName: n.friendlyName,
        locality: n.locality,
        region: n.region,
      })),
    })
  } catch (err: any) {
    return NextResponse.json({ error: `Twilio: ${err.message}` }, { status: 502 })
  }
}
