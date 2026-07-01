import { NextRequest, NextResponse } from 'next/server'
import { getAuthedUser, createServiceClient } from '@/lib/supabase/server'
import twilio from 'twilio'

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

  const { message, product_tags } = body
  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return NextResponse.json({ error: 'message is required' }, { status: 400 })
  }
  if (message.length > 160) {
    return NextResponse.json({ error: 'message must be 160 characters or less' }, { status: 400 })
  }

  const admin = createServiceClient()

  // Load Twilio subaccount credentials
  const { data: twilioAccount } = await admin
    .from('twilio_subaccounts')
    .select('account_sid, auth_token, phone_number, messaging_service_sid')
    .eq('client_id', targetClientId)
    .single()

  if (!twilioAccount) {
    return NextResponse.json({ error: 'SMS not configured for this client' }, { status: 404 })
  }

  // Load opted-in customers (optionally filtered by product_interests)
  let query = admin
    .from('customers')
    .select('id, phone')
    .eq('client_id', targetClientId)
    .eq('sms_consent', true)
    .not('phone', 'is', null)

  if (product_tags?.length) {
    query = query.overlaps('product_interests', product_tags)
  }

  const { data: customers } = await query

  if (!customers || customers.length === 0) {
    return NextResponse.json({ sent: 0, message: 'No opted-in customers with phone numbers' })
  }

  // Send via Twilio subaccount
  const twilioClient = twilio(twilioAccount.account_sid, twilioAccount.auth_token)
  const from = twilioAccount.messaging_service_sid
    ? undefined
    : twilioAccount.phone_number

  const results = await Promise.allSettled(
    customers.map(async (customer) => {
      let msg
      try {
        msg = await twilioClient.messages.create({
          body: message,
          to: customer.phone!,
          ...(twilioAccount.messaging_service_sid
            ? { messagingServiceSid: twilioAccount.messaging_service_sid }
            : { from }),
        })
      } catch (err: any) {
        console.error(`Twilio error for ${customer.phone}:`, err?.message, err?.code, err?.moreInfo)
        throw err
      }

      // Log to notification_log
      await admin.from('notification_log').insert({
        client_id: targetClientId,
        customer_id: customer.id,
        channel: 'sms',
        message_preview: message.substring(0, 50),
        status: msg.status,
        provider_message_id: msg.sid,
        twilio_subaccount_sid: twilioAccount.account_sid,
      })

      return msg.sid
    })
  )

  const sent = results.filter(r => r.status === 'fulfilled').length
  const failed = results.filter(r => r.status === 'rejected').length
  const errors = results
    .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
    .map(r => r.reason?.message ?? String(r.reason))

  return NextResponse.json({ sent, failed, total: customers.length, errors })
}
