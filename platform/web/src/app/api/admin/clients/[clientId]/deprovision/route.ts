import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import twilio from 'twilio'

// De-provisioning steps (in order):
// 1. Suspend Twilio subaccount
// 2. Delete all Storage assets under {client_id}/
// 3. Delete Supabase Auth users for this client
// 4. Delete client row (cascades to all 11 tenant tables via FK)
//
// The cascade handles: client_branding, locations, products, daily_status,
// customers, preorders, preorder_items, announcements, payment_intents,
// notification_log, twilio_subaccounts

export async function POST(req: NextRequest, { params }: { params: { clientId: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user?.app_metadata?.role !== 'shawcliffe_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Require explicit confirmation body
  const body = await req.json().catch(() => ({}))
  if (body.confirm !== params.clientId) {
    return NextResponse.json(
      { error: 'Send { confirm: "<clientId>" } to confirm de-provisioning' },
      { status: 400 }
    )
  }

  const admin = createServiceClient()
  const log: string[] = []
  const errors: string[] = []

  // Verify client exists
  const { data: client } = await admin
    .from('clients')
    .select('id, business_name')
    .eq('id', params.clientId)
    .single()

  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

  // Step 1 — Suspend Twilio subaccount
  try {
    const { data: twilioAccount } = await admin
      .from('twilio_subaccounts')
      .select('account_sid, auth_token')
      .eq('client_id', params.clientId)
      .single()

    if (twilioAccount) {
      const masterClient = twilio(
        process.env.TWILIO_ACCOUNT_SID!,
        process.env.TWILIO_AUTH_TOKEN!
      )
      await masterClient.api.accounts(twilioAccount.account_sid).update({ status: 'suspended' })
      log.push('Twilio subaccount suspended')
    } else {
      log.push('No Twilio subaccount found — skipped')
    }
  } catch (err: any) {
    errors.push(`Twilio: ${err.message}`)
  }

  // Step 2 — Delete Storage assets under {client_id}/
  try {
    const { data: files } = await admin.storage
      .from('assets')
      .list(params.clientId, { limit: 1000 })

    if (files && files.length > 0) {
      const paths = files.map(f => `${params.clientId}/${f.name}`)
      await admin.storage.from('assets').remove(paths)
      log.push(`Deleted ${files.length} Storage assets`)
    } else {
      log.push('No Storage assets found — skipped')
    }
  } catch (err: any) {
    errors.push(`Storage: ${err.message}`)
  }

  // Step 3 — Delete Supabase Auth users for this client
  try {
    const { data: authUsers } = await admin.auth.admin.listUsers()
    const clientUsers = authUsers.users.filter(
      u => u.app_metadata?.client_id === params.clientId
    )

    for (const u of clientUsers) {
      await admin.auth.admin.deleteUser(u.id)
    }
    log.push(`Deleted ${clientUsers.length} Auth user(s)`)
  } catch (err: any) {
    errors.push(`Auth: ${err.message}`)
  }

  // Step 4 — Delete client row (cascades to all 11 tenant tables)
  try {
    const { error } = await admin
      .from('clients')
      .delete()
      .eq('id', params.clientId)

    if (error) throw error
    log.push('Client row deleted (cascade removed all tenant data)')
  } catch (err: any) {
    errors.push(`DB: ${err.message}`)
    return NextResponse.json({ ok: false, log, errors }, { status: 500 })
  }

  return NextResponse.json({
    ok: errors.length === 0,
    client_name: client.business_name,
    log,
    errors,
  })
}
