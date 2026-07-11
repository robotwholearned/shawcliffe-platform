import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { normalizePhone } from '@/lib/phone'
import { emailError } from '@/lib/email'
import { Resend } from 'resend'

const FROM_ADDRESS = 'cassandra@shawcliffedigital.com'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { client_id, customer_name, customer_phone, customer_email, items, pickup_window_start, pickup_window_end, notes } = body

  if (!client_id || !customer_name || (!customer_phone && !customer_email) || !items?.length) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const normalizedPhone = customer_phone ? normalizePhone(customer_phone) : null
  if (customer_phone && !normalizedPhone) {
    return NextResponse.json({ error: 'Invalid phone number format' }, { status: 400 })
  }
  if (customer_email && emailError(customer_email)) {
    return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Verify client is active
  const { data: client } = await supabase
    .from('clients')
    .select('id, operator_email, client_branding(app_name)')
    .eq('id', client_id)
    .eq('active', true)
    .single()

  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

  // Check quantity caps for each product
  const orderedItems: { name: string; quantity: number }[] = []
  for (const item of items as { product_id: string; quantity: number }[]) {
    const { data: product } = await supabase
      .from('products')
      .select('quantity_limit, name')
      .eq('client_id', client_id)
      .eq('id', item.product_id)
      .single()

    if (!product) {
      return NextResponse.json({ error: `Product not found` }, { status: 404 })
    }
    orderedItems.push({ name: product.name, quantity: item.quantity })

    if (product.quantity_limit != null) {
      // Count existing pending/confirmed preorder quantities for this product
      const { data: existingItems } = await supabase
        .from('preorder_items')
        .select('quantity, preorders!inner(status)')
        .eq('client_id', client_id)
        .eq('product_id', item.product_id)
        .in('preorders.status', ['pending', 'confirmed'])

      const reserved = (existingItems ?? []).reduce((sum: number, r: any) => sum + r.quantity, 0)
      if (reserved + item.quantity > product.quantity_limit) {
        return NextResponse.json(
          { error: `Reservation Full`, product: product.name },
          { status: 409 }
        )
      }
    }
  }

  // Find or create customer record
  const ipHash = 'preorder-no-ip'
  let customerId: string

  const emailOrPhone = customer_email || customer_phone
  // Strip PostgREST filter-syntax metacharacters so a submitted email/phone
  // can't break out of this .or() clause into an injected condition.
  const safeEmail = (customer_email ?? '').replace(/[,()]/g, '')
  const safePhone = (normalizedPhone ?? '').replace(/[,()]/g, '')
  const { data: existingCustomer } = await supabase
    .from('customers')
    .select('id')
    .eq('client_id', client_id)
    .or(`email.eq.${safeEmail},phone.eq.${safePhone}`)
    .maybeSingle()

  if (existingCustomer) {
    customerId = existingCustomer.id
  } else {
    const { data: newCustomer, error: customerError } = await supabase
      .from('customers')
      .insert({
        client_id,
        name: customer_name,
        phone: normalizedPhone,
        email: customer_email || null,
        sms_consent: false,
        email_consent: false,
        signup_source: 'website',
        consent_text_version: 'v1-preorder-2026-06-02',
        consent_ip_hash: ipHash,
      })
      .select('id')
      .single()

    if (customerError || !newCustomer) {
      return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 })
    }
    customerId = newCustomer.id
  }

  // Create preorder
  const { data: preorder, error: preorderError } = await supabase
    .from('preorders')
    .insert({
      client_id,
      customer_id: customerId,
      pickup_window_start: pickup_window_start || null,
      pickup_window_end: pickup_window_end || null,
      notes: notes || null,
      status: 'pending',
    })
    .select('id')
    .single()

  if (preorderError || !preorder) {
    return NextResponse.json({ error: 'Failed to create preorder' }, { status: 500 })
  }

  // Insert preorder items
  const itemRows = (items as { product_id: string; quantity: number }[]).map(item => ({
    client_id,
    preorder_id: preorder.id,
    product_id: item.product_id,
    quantity: item.quantity,
  }))

  const { error: itemsError } = await supabase.from('preorder_items').insert(itemRows)
  if (itemsError) {
    return NextResponse.json({ error: 'Failed to save preorder items' }, { status: 500 })
  }

  // Fire-and-forget: the preorder is already saved, so notification delivery
  // shouldn't block the customer-facing response on two Resend round-trips.
  sendPreorderEmails(supabase, {
    clientId: client_id,
    operatorEmail: client.operator_email,
    fromName: getBrandingAppName(client.client_branding) ?? 'Your Local Seller',
    customerId,
    customerName: customer_name,
    customerPhone: normalizedPhone,
    customerEmail: customer_email || null,
    items: orderedItems,
    pickupWindowStart: pickup_window_start || null,
    pickupWindowEnd: pickup_window_end || null,
    notes: notes || null,
  }).catch((err) => console.error('preorder notification dispatch failed', err))

  return NextResponse.json({ preorder_id: preorder.id }, { status: 201 })
}

// Supabase's generated types embed a to-one PostgREST relation as an array
// regardless of the underlying FK being unique — normalize either shape.
function getBrandingAppName(embed: unknown): string | null {
  const row = Array.isArray(embed) ? embed[0] : embed
  return (row as { app_name?: string | null } | null)?.app_name ?? null
}

async function sendPreorderEmails(
  supabase: ReturnType<typeof createServiceClient>,
  info: {
    clientId: string
    operatorEmail: string | null
    fromName: string
    customerId: string
    customerName: string
    customerPhone: string | null
    customerEmail: string | null
    items: { name: string; quantity: number }[]
    pickupWindowStart: string | null
    pickupWindowEnd: string | null
    notes: string | null
  }
) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  const itemsSummary = info.items.map(i => `${i.quantity}x ${i.name}`).join(', ')

  const sendOwnerEmail = async () => {
    if (!info.operatorEmail) return
    try {
      const { data } = await resend.emails.send({
        from: `${info.fromName} <${FROM_ADDRESS}>`,
        to: info.operatorEmail,
        subject: `New preorder from ${info.customerName}`,
        html: ownerEmailTemplate(info, itemsSummary),
        text: ownerEmailText(info, itemsSummary),
      })

      await supabase.from('notification_log').insert({
        client_id: info.clientId,
        customer_id: info.customerId,
        channel: 'email',
        message_preview: `New preorder from ${info.customerName}`.substring(0, 50),
        status: 'sent',
        provider_message_id: data?.id ?? null,
      })
    } catch (err) {
      console.error('preorder owner email failed', err)
    }
  }

  const sendCustomerEmail = async () => {
    if (!info.customerEmail) return
    try {
      const { data } = await resend.emails.send({
        from: `${info.fromName} <${FROM_ADDRESS}>`,
        to: info.customerEmail,
        subject: `Your preorder is confirmed`,
        html: customerEmailTemplate(info.fromName, itemsSummary),
        text: `Thanks for your preorder with ${info.fromName}! We've received it: ${itemsSummary}. Pay at pickup — no payment required now.`,
      })

      await supabase.from('notification_log').insert({
        client_id: info.clientId,
        customer_id: info.customerId,
        channel: 'email',
        message_preview: 'Preorder confirmation',
        status: 'sent',
        provider_message_id: data?.id ?? null,
      })
    } catch (err) {
      console.error('preorder customer confirmation email failed', err)
    }
  }

  await Promise.allSettled([sendOwnerEmail(), sendCustomerEmail()])
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function ownerEmailText(
  info: {
    customerName: string
    customerPhone: string | null
    customerEmail: string | null
    pickupWindowStart: string | null
    pickupWindowEnd: string | null
    notes: string | null
  },
  itemsSummary: string
): string {
  return [
    `New preorder from ${info.customerName}`,
    `Items: ${itemsSummary}`,
    info.pickupWindowStart && `Pickup from: ${info.pickupWindowStart}`,
    info.pickupWindowEnd && `Pickup until: ${info.pickupWindowEnd}`,
    info.notes && `Notes: ${info.notes}`,
    info.customerPhone && `Phone: ${info.customerPhone}`,
    info.customerEmail && `Email: ${info.customerEmail}`,
  ]
    .filter(Boolean)
    .join('\n')
}

function ownerEmailTemplate(info: Parameters<typeof ownerEmailText>[0], itemsSummary: string): string {
  const rows = [
    ['Items', itemsSummary],
    ['Pickup from', info.pickupWindowStart],
    ['Pickup until', info.pickupWindowEnd],
    ['Phone', info.customerPhone],
    ['Email', info.customerEmail],
  ].filter(([, v]) => v)

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1f2937;">
  <h2 style="margin: 0 0 16px; font-size: 20px; color: #111827;">New preorder from ${escapeHtml(info.customerName)}</h2>
  <table style="font-size: 15px; line-height: 1.6; border-collapse: collapse;">
    ${rows.map(([k, v]) => `<tr><td style="padding: 2px 12px 2px 0; color: #6b7280;">${escapeHtml(k as string)}</td><td>${escapeHtml(v as string)}</td></tr>`).join('')}
  </table>
  ${info.notes ? `<p style="font-size: 15px; line-height: 1.6; white-space: pre-wrap; margin-top: 16px;">${escapeHtml(info.notes)}</p>` : ''}
</body>
</html>
  `.trim()
}

function customerEmailTemplate(fromName: string, itemsSummary: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1f2937;">
  <h2 style="margin: 0 0 16px; font-size: 20px; color: #111827;">${fromName}</h2>
  <p style="font-size: 15px; line-height: 1.6;">Thanks for your preorder! We've received it: ${escapeHtml(itemsSummary)}.</p>
  <p style="font-size: 15px; line-height: 1.6;">Pay at pickup — no payment required now.</p>
</body>
</html>
  `.trim()
}
