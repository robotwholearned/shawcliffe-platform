import { NextRequest, NextResponse } from 'next/server'
import { getAuthedUser, createServiceClient } from '@/lib/supabase/server'
import { sendPush, isConfigured } from '@/lib/apns'

export async function POST(req: NextRequest) {
  // Verify caller is client_staff or shawcliffe_admin
  const user = await getAuthedUser(req)
  const role = user?.app_metadata?.role
  const clientId = user?.app_metadata?.client_id

  if (!user || (role !== 'client_staff' && role !== 'shawcliffe_admin')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const targetClientId: string = role === 'shawcliffe_admin' ? body.client_id : clientId

  if (!targetClientId) {
    return NextResponse.json({ error: 'client_id required' }, { status: 400 })
  }

  const { message, product_tags, test } = body
  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return NextResponse.json({ error: 'message is required' }, { status: 400 })
  }

  if (!isConfigured()) {
    return NextResponse.json({ error: 'Push notifications are not configured on this server' }, { status: 503 })
  }

  const admin = createServiceClient()

  const { data: branding } = await admin
    .from('client_branding')
    .select('apple_bundle_id')
    .eq('client_id', targetClientId)
    .single()

  let customers: { id: string | null; apns_token: string | null }[]

  if (test) {
    const { data: client } = await admin
      .from('clients')
      .select('operator_email, operator_phone')
      .eq('id', targetClientId)
      .single()

    const { data: selfCustomer } = await admin
      .from('customers')
      .select('id, apns_token')
      .eq('client_id', targetClientId)
      .not('apns_token', 'is', null)
      .or(`email.eq.${client?.operator_email ?? ''},phone.eq.${client?.operator_phone ?? ''}`)
      .limit(1)
      .maybeSingle()

    if (!selfCustomer) {
      return NextResponse.json(
        { error: 'No test device found. Sign up for the app yourself using your operator email or phone, then try again.' },
        { status: 400 }
      )
    }
    customers = [selfCustomer]
  } else {
    // Load opted-in customers with a registered device token
    let query = admin
      .from('customers')
      .select('id, apns_token')
      .eq('client_id', targetClientId)
      .not('apns_token', 'is', null)

    if (product_tags?.length) {
      query = query.overlaps('product_interests', product_tags)
    }

    const { data } = await query
    customers = data ?? []

    if (customers.length === 0) {
      return NextResponse.json({ sent: 0, message: 'No customers with a registered device' })
    }
  }

  const results = await sendPush(
    customers.map((c) => c.apns_token as string),
    message,
    branding?.apple_bundle_id ?? undefined
  )

  const tokenToCustomer = new Map(customers.map((c) => [c.apns_token, c.id]))

  await Promise.all(
    results.map((r) =>
      admin.from('notification_log').insert({
        client_id: targetClientId,
        customer_id: tokenToCustomer.get(r.token) ?? null,
        channel: 'push',
        message_preview: (test ? '[TEST] ' : '') + message.substring(0, 50),
        status: r.ok ? 'sent' : 'failed',
      })
    )
  )

  const sent = results.filter((r) => r.ok).length
  const failed = results.filter((r) => !r.ok).length
  const errors = results.filter((r) => !r.ok).map((r) => r.error ?? 'Unknown error')

  return NextResponse.json({ sent, failed, total: customers.length, errors })
}
