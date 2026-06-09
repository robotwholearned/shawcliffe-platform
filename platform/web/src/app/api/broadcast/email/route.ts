import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

const FROM_ADDRESS = 'cassandra@shawcliffedigital.com'

export async function POST(req: NextRequest) {
  // Verify caller is client_staff or shawcliffe_admin
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
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

  const { subject, message, product_tags } = body
  if (!subject?.trim() || !message?.trim()) {
    return NextResponse.json({ error: 'subject and message are required' }, { status: 400 })
  }

  const admin = createServiceClient()

  // Load client branding for the from name
  const { data: branding } = await admin
    .from('client_branding')
    .select('app_name')
    .eq('client_id', targetClientId)
    .single()

  const fromName = branding?.app_name ?? 'Your Local Seller'

  // Load opted-in customers with email
  let query = admin
    .from('customers')
    .select('id, name, email')
    .eq('client_id', targetClientId)
    .eq('email_consent', true)
    .not('email', 'is', null)

  if (product_tags?.length) {
    query = query.overlaps('product_interests', product_tags)
  }

  const { data: customers } = await query

  if (!customers || customers.length === 0) {
    return NextResponse.json({ sent: 0, message: 'No opted-in customers with email addresses' })
  }

  const resend = new Resend(process.env.RESEND_API_KEY)

  const results = await Promise.allSettled(
    customers.map(async (customer) => {
      const { data, error } = await resend.emails.send({
        from: `${fromName} <${FROM_ADDRESS}>`,
        to: customer.email!,
        subject,
        html: emailTemplate(fromName, message),
        text: message,
      })

      if (error) throw error

      await admin.from('notification_log').insert({
        client_id: targetClientId,
        customer_id: customer.id,
        channel: 'email',
        message_preview: subject.substring(0, 50),
        status: 'sent',
        provider_message_id: data?.id ?? null,
      })

      return data?.id
    })
  )

  const sent = results.filter(r => r.status === 'fulfilled').length
  const failed = results.filter(r => r.status === 'rejected').length

  return NextResponse.json({ sent, failed, total: customers.length })
}

function emailTemplate(fromName: string, message: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1f2937;">
  <h2 style="margin: 0 0 16px; font-size: 20px; color: #111827;">${fromName}</h2>
  <div style="font-size: 15px; line-height: 1.6; white-space: pre-wrap;">${message}</div>
  <hr style="margin: 32px 0; border: none; border-top: 1px solid #e5e7eb;">
  <p style="font-size: 12px; color: #9ca3af; margin: 0;">
    You're receiving this because you signed up for updates from ${fromName}.<br>
    To unsubscribe, reply with "UNSUBSCRIBE".
  </p>
</body>
</html>
  `.trim()
}
