import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import twilio from 'twilio'

export async function POST(req: NextRequest, { params }: { params: { clientId: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user?.app_metadata?.role !== 'shawcliffe_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { phoneNumber } = await req.json()
  if (!phoneNumber || typeof phoneNumber !== 'string') {
    return NextResponse.json({ error: 'phoneNumber is required' }, { status: 400 })
  }

  const admin = createServiceClient()

  const { data: twilioAccount } = await admin
    .from('twilio_subaccounts')
    .select('account_sid, auth_token, phone_number')
    .eq('client_id', params.clientId)
    .single()

  if (!twilioAccount) {
    return NextResponse.json({ error: 'No Twilio subaccount for this client yet' }, { status: 404 })
  }
  if (twilioAccount.phone_number) {
    return NextResponse.json({ error: 'This client already has a number' }, { status: 409 })
  }

  const client = twilio(twilioAccount.account_sid, twilioAccount.auth_token)

  let purchased
  try {
    purchased = await client.incomingPhoneNumbers.create({ phoneNumber })
  } catch (err: any) {
    return NextResponse.json({ error: `Twilio: ${err.message}` }, { status: 502 })
  }

  const { error } = await admin
    .from('twilio_subaccounts')
    .update({ phone_number: purchased.phoneNumber, phone_number_sid: purchased.sid })
    .eq('client_id', params.clientId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, phoneNumber: purchased.phoneNumber, phoneNumberSid: purchased.sid })
}
