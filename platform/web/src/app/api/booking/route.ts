import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { normalizePhone } from '@/lib/phone'
import { hasComponent } from '@/lib/components'
import { Resend } from 'resend'

const FROM_ADDRESS = 'cassandra@shawcliffedigital.com'
const CONSENT_TEXT_VERSION = 'v1-booking-2026-07-09'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const {
    client_id,
    name,
    phone,
    email,
    sms_consent,
    email_consent,
    signup_source,
    service,
    requested_date,
    requested_time,
    notes,
    pet_name,
    pet_breed,
    pet_size,
    pet_age,
    pet_allergies,
    pet_behavior_notes,
    pet_grooming_preferences,
    pet_vaccination_info,
    pet_emergency_contact,
    pet_care_instructions,
  } = body

  if (!client_id || !name || (!phone && !email)) {
    return NextResponse.json({ error: 'client_id, name, and phone or email are required' }, { status: 400 })
  }

  const normalizedPhone = phone ? normalizePhone(phone) : null
  if (phone && !normalizedPhone) {
    return NextResponse.json({ error: 'Invalid phone number format' }, { status: 400 })
  }

  // Hash IP for CASL/TCPA logging — we never store the raw IP
  const forwarded = req.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown'
  const ipHash = await hashIp(ip)

  const supabase = createServiceClient()

  // Verify client exists and is active
  const { data: client } = await supabase
    .from('clients')
    .select('id, operator_email, enabled_components, client_branding(app_name)')
    .eq('id', client_id)
    .eq('active', true)
    .single()

  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  }

  // Find or create customer record
  // Strip PostgREST filter-syntax metacharacters so a submitted email/phone
  // can't break out of this .or() clause into an injected condition.
  const safeEmail = (email ?? '').replace(/[,()]/g, '')
  const safePhone = (normalizedPhone ?? '').replace(/[,()]/g, '')
  let customerId: string
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
        name,
        phone: normalizedPhone,
        email: email || null,
        sms_consent: sms_consent ?? false,
        email_consent: email_consent ?? false,
        signup_source: signup_source ?? 'app',
        consent_text_version: CONSENT_TEXT_VERSION,
        consent_ip_hash: ipHash,
      })
      .select('id')
      .single()

    if (customerError || !newCustomer) {
      return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 })
    }
    customerId = newCustomer.id
  }

  // Pet Profiles (Tier 1): a pet is created alongside the booking rather
  // than through a standalone screen — see 018_pet_profiles.sql.
  let petId: string | null = null
  const hasPetFields = pet_name || pet_breed || pet_size || pet_age || pet_allergies || pet_behavior_notes || pet_grooming_preferences || pet_vaccination_info || pet_emergency_contact || pet_care_instructions
  if (hasPetFields && hasComponent(client.enabled_components, 'pet_profiles')) {
    const { data: pet } = await supabase
      .from('pets')
      .insert({
        client_id,
        customer_id: customerId,
        name: pet_name || null,
        breed: pet_breed || null,
        size: pet_size || null,
        age: pet_age || null,
        allergies: pet_allergies || null,
        behavior_notes: pet_behavior_notes || null,
        grooming_preferences: pet_grooming_preferences || null,
        vaccination_info: pet_vaccination_info || null,
        emergency_contact: pet_emergency_contact || null,
        care_instructions: pet_care_instructions || null,
      })
      .select('id')
      .single()
    petId = pet?.id ?? null
  }

  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .insert({
      client_id,
      customer_id: customerId,
      service: service || null,
      requested_date: requested_date || null,
      requested_time: requested_time || null,
      notes: notes || null,
      pet_id: petId,
    })
    .select('id')
    .single()

  if (bookingError || !booking) {
    return NextResponse.json({ error: 'Failed to save booking request' }, { status: 500 })
  }

  // Fire-and-forget: the booking is already saved, so notification delivery
  // shouldn't block the customer-facing response on two Resend round-trips.
  sendBookingEmails(supabase, {
    clientId: client_id,
    operatorEmail: client.operator_email,
    fromName: getBrandingAppName(client.client_branding) ?? 'Your Local Seller',
    customerId,
    customerName: name,
    customerPhone: normalizedPhone,
    customerEmail: email || null,
    service: service || null,
    requestedDate: requested_date || null,
    requestedTime: requested_time || null,
    notes: notes || null,
  }).catch((err) => console.error('booking notification dispatch failed', err))

  return NextResponse.json({ booking_id: booking.id }, { status: 201 })
}

// Supabase's generated types embed a to-one PostgREST relation as an array
// regardless of the underlying FK being unique — normalize either shape.
function getBrandingAppName(embed: unknown): string | null {
  const row = Array.isArray(embed) ? embed[0] : embed
  return (row as { app_name?: string | null } | null)?.app_name ?? null
}

async function hashIp(ip: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(ip + process.env.SUPABASE_SERVICE_ROLE_KEY)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')
}

async function sendBookingEmails(
  supabase: ReturnType<typeof createServiceClient>,
  info: {
    clientId: string
    operatorEmail: string | null
    fromName: string
    customerId: string
    customerName: string
    customerPhone: string | null
    customerEmail: string | null
    service: string | null
    requestedDate: string | null
    requestedTime: string | null
    notes: string | null
  }
) {
  const resend = new Resend(process.env.RESEND_API_KEY)

  const sendOwnerEmail = async () => {
    if (!info.operatorEmail) return
    try {
      const { data } = await resend.emails.send({
        from: `${info.fromName} <${FROM_ADDRESS}>`,
        to: info.operatorEmail,
        subject: `New booking request${info.service ? `: ${info.service}` : ''}`,
        html: ownerEmailTemplate(info),
        text: ownerEmailText(info),
      })

      await supabase.from('notification_log').insert({
        client_id: info.clientId,
        customer_id: info.customerId,
        channel: 'email',
        message_preview: `New booking request from ${info.customerName}`.substring(0, 50),
        status: 'sent',
        provider_message_id: data?.id ?? null,
      })
    } catch (err) {
      console.error('booking owner email failed', err)
    }
  }

  const sendCustomerEmail = async () => {
    if (!info.customerEmail) return
    try {
      const { data } = await resend.emails.send({
        from: `${info.fromName} <${FROM_ADDRESS}>`,
        to: info.customerEmail,
        subject: `We received your booking request`,
        html: customerEmailTemplate(info.fromName),
        text: `Thanks for reaching out to ${info.fromName}! We received your booking request and will confirm with you soon.`,
      })

      await supabase.from('notification_log').insert({
        client_id: info.clientId,
        customer_id: info.customerId,
        channel: 'email',
        message_preview: 'Booking request confirmation',
        status: 'sent',
        provider_message_id: data?.id ?? null,
      })
    } catch (err) {
      console.error('booking customer confirmation email failed', err)
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

function ownerEmailText(info: {
  customerName: string
  customerPhone: string | null
  customerEmail: string | null
  service: string | null
  requestedDate: string | null
  requestedTime: string | null
  notes: string | null
}): string {
  return [
    `New booking request from ${info.customerName}`,
    info.service && `Service: ${info.service}`,
    info.requestedDate && `Requested date: ${info.requestedDate}`,
    info.requestedTime && `Requested time: ${info.requestedTime}`,
    info.notes && `Notes: ${info.notes}`,
    info.customerPhone && `Phone: ${info.customerPhone}`,
    info.customerEmail && `Email: ${info.customerEmail}`,
  ]
    .filter(Boolean)
    .join('\n')
}

function ownerEmailTemplate(info: Parameters<typeof ownerEmailText>[0]): string {
  const rows = [
    ['Service', info.service],
    ['Requested date', info.requestedDate],
    ['Requested time', info.requestedTime],
    ['Phone', info.customerPhone],
    ['Email', info.customerEmail],
  ].filter(([, v]) => v)

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1f2937;">
  <h2 style="margin: 0 0 16px; font-size: 20px; color: #111827;">New booking request from ${escapeHtml(info.customerName)}</h2>
  <table style="font-size: 15px; line-height: 1.6; border-collapse: collapse;">
    ${rows.map(([k, v]) => `<tr><td style="padding: 2px 12px 2px 0; color: #6b7280;">${escapeHtml(k as string)}</td><td>${escapeHtml(v as string)}</td></tr>`).join('')}
  </table>
  ${info.notes ? `<p style="font-size: 15px; line-height: 1.6; white-space: pre-wrap; margin-top: 16px;">${escapeHtml(info.notes)}</p>` : ''}
</body>
</html>
  `.trim()
}

function customerEmailTemplate(fromName: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1f2937;">
  <h2 style="margin: 0 0 16px; font-size: 20px; color: #111827;">${fromName}</h2>
  <p style="font-size: 15px; line-height: 1.6;">Thanks for your booking request! We received it and will confirm with you soon.</p>
</body>
</html>
  `.trim()
}
