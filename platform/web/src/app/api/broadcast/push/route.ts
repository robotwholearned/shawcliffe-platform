import { NextRequest, NextResponse } from 'next/server'
import { getAuthedUser, createServiceClient } from '@/lib/supabase/server'
import { PUSH_MONTHLY_ALLOTMENT, getUsageThisMonth } from '@/lib/sms-limits'
import { sendPush, isConfigured as apnsConfigured, isInvalidTokenError } from '@/lib/apns'
import { sendFcmPush, isConfigured as fcmConfigured, isUnregisteredError } from '@/lib/fcm'
import type { PushToken } from '@/lib/supabase/types'

interface DispatchResult {
  token: string
  ok: boolean
  error?: string
}

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

  const admin = createServiceClient()

  const { data: branding } = await admin
    .from('client_branding')
    .select('apple_bundle_id')
    .eq('client_id', targetClientId)
    .single()

  let customerIds: string[]
  let capped = false

  if (test) {
    const { data: client } = await admin
      .from('clients')
      .select('operator_email, operator_phone')
      .eq('id', targetClientId)
      .single()

    const { data: selfCustomer } = await admin
      .from('customers')
      .select('id')
      .eq('client_id', targetClientId)
      .or(`email.eq.${client?.operator_email ?? ''},phone.eq.${client?.operator_phone ?? ''}`)
      .limit(1)
      .maybeSingle()

    if (!selfCustomer) {
      return NextResponse.json(
        { error: 'No test device found. Sign up for the app yourself using your operator email or phone, then try again.' },
        { status: 400 }
      )
    }
    customerIds = [selfCustomer.id]
  } else {
    const { data: client } = await admin.from('clients').select('tier').eq('id', targetClientId).single()
    const tier = (client?.tier ?? 1) as 1 | 2 | 3
    const allotment = PUSH_MONTHLY_ALLOTMENT[tier]
    const used = await getUsageThisMonth(admin, targetClientId, 'push')
    const remaining = Math.max(0, allotment - used)

    if (remaining === 0) {
      return NextResponse.json(
        { error: `Monthly push limit reached (${allotment} included on this plan)`, limit: allotment, used },
        { status: 429 }
      )
    }

    let query = admin
      .from('customers')
      .select('id')
      .eq('client_id', targetClientId)
      .eq('push_consent', true)

    if (product_tags?.length) {
      query = query.overlaps('product_interests', product_tags)
    }

    const { data } = await query
    customerIds = (data ?? []).map((c) => c.id)

    if (customerIds.length === 0) {
      return NextResponse.json({ sent: 0, message: 'No customers with push notifications enabled' })
    }

    if (customerIds.length > remaining) {
      customerIds = customerIds.slice(0, remaining)
      capped = true
    }
  }

  const { data: tokenRows } = await admin
    .from('push_tokens')
    .select('*')
    .eq('client_id', targetClientId)
    .in('customer_id', customerIds)
    .is('invalidated_at', null)

  const tokens = (tokenRows ?? []) as PushToken[]

  if (tokens.length === 0) {
    return NextResponse.json({ sent: 0, message: 'No customers with a registered device' })
  }

  const tokenById = new Map(tokens.map((t) => [t.token, t]))
  const dispatched: DispatchResult[] = []

  const iosTokens = tokens.filter((t) => t.platform === 'ios')
  if (iosTokens.length > 0) {
    if (!apnsConfigured()) {
      return NextResponse.json({ error: 'APNs is not configured on this server' }, { status: 503 })
    }
    for (const environment of ['sandbox', 'production'] as const) {
      const group = iosTokens.filter((t) => (t.environment ?? 'sandbox') === environment)
      if (group.length === 0) continue
      const results = await sendPush(group.map((t) => t.token), message, branding?.apple_bundle_id ?? undefined, environment)
      dispatched.push(...results)
    }
  }

  const androidTokens = tokens.filter((t) => t.platform === 'android')
  if (androidTokens.length > 0) {
    if (!fcmConfigured()) {
      return NextResponse.json({ error: 'FCM is not configured on this server' }, { status: 503 })
    }
    const results = await sendFcmPush(androidTokens.map((t) => t.token), message)
    dispatched.push(...results)
  }

  await Promise.all(
    dispatched.map(async (r) => {
      const row = tokenById.get(r.token)
      if (!r.ok && row) {
        const invalid = row.platform === 'ios' ? isInvalidTokenError(r.error) : isUnregisteredError(r.error)
        if (invalid) {
          await admin.from('push_tokens').update({ invalidated_at: new Date().toISOString() }).eq('client_id', targetClientId).eq('id', row.id)
        }
      }
      await admin.from('notification_log').insert({
        client_id: targetClientId,
        customer_id: row?.customer_id ?? null,
        channel: 'push',
        message_preview: (test ? '[TEST] ' : '') + message.substring(0, 50),
        status: r.ok ? 'sent' : 'failed',
      })
    })
  )

  const sent = dispatched.filter((r) => r.ok).length
  const failed = dispatched.filter((r) => !r.ok).length
  const errors = dispatched.filter((r) => !r.ok).map((r) => r.error ?? 'Unknown error')

  return NextResponse.json({ sent, failed, total: tokens.length, errors, capped })
}
