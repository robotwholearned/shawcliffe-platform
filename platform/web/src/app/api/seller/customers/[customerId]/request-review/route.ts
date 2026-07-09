import { NextRequest, NextResponse } from 'next/server'
import { getAuthedUser, createServiceClient } from '@/lib/supabase/server'
import { hasComponent } from '@/lib/components'
import { SMS_MONTHLY_ALLOTMENT, getSmsUsageThisMonth } from '@/lib/sms-limits'
import { Resend } from 'resend'
import twilio from 'twilio'

const FROM_ADDRESS = 'cassandra@shawcliffedigital.com'
const DEFAULT_MESSAGE = "Thanks for stopping by! We'd really appreciate a quick review."

// Seller-triggered manual review request (Review Request System, Tier 1).
// Sends the client's Google review link to one customer via whichever
// channel they've consented to (SMS preferred, email fallback) — same
// Twilio-subaccount/Resend patterns as broadcast SMS and the inquiry/booking
// confirmation emails. No new domain table: reuses client_branding for the
// link/wording and notification_log for the send record.
export async function POST(req: NextRequest, { params }: { params: { customerId: string } }) {
  const user = await getAuthedUser(req)
  const role = user?.app_metadata?.role
  const clientId = user?.app_metadata?.client_id

  if (!user || (role !== 'client_staff' && role !== 'shawcliffe_admin')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!clientId) {
    return NextResponse.json({ error: 'client_id required' }, { status: 400 })
  }

  const admin = createServiceClient()

  const { data: client } = await admin
    .from('clients')
    .select('enabled_components')
    .eq('id', clientId)
    .single()

  if (!hasComponent(client?.enabled_components, 'review_request_system')) {
    return NextResponse.json({ error: 'Component not enabled' }, { status: 403 })
  }

  const { data: branding } = await admin
    .from('client_branding')
    .select('app_name, google_review_url, review_request_message')
    .eq('client_id', clientId)
    .single()

  if (!branding?.google_review_url) {
    return NextResponse.json({ error: 'No Google review link configured for this client' }, { status: 400 })
  }

  const { data: customer } = await admin
    .from('customers')
    .select('id, name, phone, email, sms_consent, email_consent')
    .eq('client_id', clientId)
    .eq('id', params.customerId)
    .single()

  if (!customer) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
  }

  const messageBody = branding.review_request_message || DEFAULT_MESSAGE
  const fromName = branding.app_name ?? 'Your Local Seller'

  if (customer.sms_consent && customer.phone) {
    const { data: twilioAccount } = await admin
      .from('twilio_subaccounts')
      .select('account_sid, auth_token, phone_number, messaging_service_sid')
      .eq('client_id', clientId)
      .single()

    if (twilioAccount) {
      const { data: clientTier } = await admin.from('clients').select('tier').eq('id', clientId).single()
      const tier = (clientTier?.tier ?? 1) as 1 | 2 | 3
      const used = await getSmsUsageThisMonth(admin, clientId)

      if (used < SMS_MONTHLY_ALLOTMENT[tier]) {
        const smsText = `${messageBody} ${branding.google_review_url}`
        if (smsText.length > 160) {
          return NextResponse.json({ error: 'Review request message + link exceeds 160 characters for SMS' }, { status: 400 })
        }

        const twilioClient = twilio(twilioAccount.account_sid, twilioAccount.auth_token)
        try {
          const msg = await twilioClient.messages.create({
            body: smsText,
            to: customer.phone,
            ...(twilioAccount.messaging_service_sid
              ? { messagingServiceSid: twilioAccount.messaging_service_sid }
              : { from: twilioAccount.phone_number }),
          })

          await admin.from('notification_log').insert({
            client_id: clientId,
            customer_id: customer.id,
            channel: 'sms',
            message_preview: `Review request to ${customer.name}`.substring(0, 50),
            status: msg.status,
            provider_message_id: msg.sid,
            twilio_subaccount_sid: twilioAccount.account_sid,
          })

          return NextResponse.json({ ok: true, channel: 'sms' })
        } catch (err: any) {
          console.error('review request SMS failed', err?.message)
          return NextResponse.json({ error: 'Failed to send SMS review request' }, { status: 500 })
        }
      }
    }
  }

  if (customer.email_consent && customer.email) {
    const resend = new Resend(process.env.RESEND_API_KEY)
    try {
      const { data } = await resend.emails.send({
        from: `${fromName} <${FROM_ADDRESS}>`,
        to: customer.email,
        subject: `How did we do?`,
        html: reviewEmailTemplate(fromName, messageBody, branding.google_review_url),
        text: `${messageBody}\n\n${branding.google_review_url}`,
      })

      await admin.from('notification_log').insert({
        client_id: clientId,
        customer_id: customer.id,
        channel: 'email',
        message_preview: `Review request to ${customer.name}`.substring(0, 50),
        status: 'sent',
        provider_message_id: data?.id ?? null,
      })

      return NextResponse.json({ ok: true, channel: 'email' })
    } catch (err) {
      console.error('review request email failed', err)
      return NextResponse.json({ error: 'Failed to send email review request' }, { status: 500 })
    }
  }

  return NextResponse.json({ error: 'Customer has no available SMS/email consent, or the monthly SMS limit is reached' }, { status: 400 })
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function reviewEmailTemplate(fromName: string, message: string, reviewUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1f2937;">
  <h2 style="margin: 0 0 16px; font-size: 20px; color: #111827;">${escapeHtml(fromName)}</h2>
  <p style="font-size: 15px; line-height: 1.6;">${escapeHtml(message)}</p>
  <p style="margin-top: 20px;">
    <a href="${escapeHtml(reviewUrl)}" style="background: #2563eb; color: #fff; padding: 10px 18px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">
      Leave a Review
    </a>
  </p>
</body>
</html>
  `.trim()
}
