import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import twilio from 'twilio'

async function requireAdmin(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.app_metadata?.role === 'shawcliffe_admin'
}

// Creates a real Twilio subaccount for this client under Shawcliffe's master
// account, and stores its own account_sid/auth_token — each client's SMS
// traffic and toll-free verification lives in its own isolated subaccount
// (see PRD Twilio Compliance Specification).
export async function POST(req: NextRequest, { params }: { params: { clientId: string } }) {
  if (!(await requireAdmin(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createServiceClient()

  const { data: client } = await admin
    .from('clients')
    .select('id, business_name')
    .eq('id', params.clientId)
    .single()

  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

  const { data: existing } = await admin
    .from('twilio_subaccounts')
    .select('client_id')
    .eq('client_id', params.clientId)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'A Twilio subaccount already exists for this client' }, { status: 409 })
  }

  const masterClient = twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!)

  let subaccount
  try {
    subaccount = await masterClient.api.v2010.accounts.create({
      friendlyName: `Shawcliffe — ${client.business_name}`,
    })
  } catch (err: any) {
    return NextResponse.json({ error: `Twilio: ${err.message}` }, { status: 502 })
  }

  const { error } = await admin.from('twilio_subaccounts').insert({
    client_id: params.clientId,
    account_sid: subaccount.sid,
    auth_token: subaccount.authToken,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, account_sid: subaccount.sid })
}
