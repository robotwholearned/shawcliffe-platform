import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { normalizePhone } from '@/lib/phone'
import { hasComponent } from '@/lib/components'
import { Resend } from 'resend'

const FROM_ADDRESS = 'cassandra@shawcliffedigital.com'
const CONSENT_TEXT_VERSION = 'v1-inquiry-2026-07-09'

const URGENCY_VALUES = ['asap', 'this_week', 'this_month', 'flexible']
const CONTACT_METHOD_VALUES = ['phone', 'email', 'sms']

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
    service_category,
    job_location,
    urgency,
    description,
    photo_urls,
    preferred_contact_method,
    vehicle_make,
    vehicle_model,
    vehicle_year,
    vehicle_vin,
    vehicle_plate,
    vehicle_mileage,
    vehicle_notes,
    property_address,
    property_gate_code,
    property_parking_instructions,
    property_pets_on_site,
    property_access_notes,
    property_preferred_service_day,
    property_lawn_size,
    property_snow_removal_areas,
    property_cleaning_instructions,
    property_safety_notes,
  } = body

  if (!client_id || !name || (!phone && !email)) {
    return NextResponse.json({ error: 'client_id, name, and phone or email are required' }, { status: 400 })
  }

  const normalizedPhone = phone ? normalizePhone(phone) : null
  if (phone && !normalizedPhone) {
    return NextResponse.json({ error: 'Invalid phone number format' }, { status: 400 })
  }
  if (urgency && !URGENCY_VALUES.includes(urgency)) {
    return NextResponse.json({ error: 'Invalid urgency' }, { status: 400 })
  }
  if (preferred_contact_method && !CONTACT_METHOD_VALUES.includes(preferred_contact_method)) {
    return NextResponse.json({ error: 'Invalid preferred_contact_method' }, { status: 400 })
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

  // Vehicle Profiles (Tier 1): a vehicle is created alongside the inquiry
  // rather than through a standalone screen — see 017_vehicle_profiles.sql.
  let vehicleId: string | null = null
  const hasVehicleFields = vehicle_make || vehicle_model || vehicle_year || vehicle_vin || vehicle_plate || vehicle_mileage || vehicle_notes
  if (hasVehicleFields && hasComponent(client.enabled_components, 'vehicle_profiles')) {
    const { data: vehicle } = await supabase
      .from('vehicles')
      .insert({
        client_id,
        customer_id: customerId,
        make: vehicle_make || null,
        model: vehicle_model || null,
        year: vehicle_year || null,
        vin: vehicle_vin || null,
        plate: vehicle_plate || null,
        mileage: vehicle_mileage || null,
        notes: vehicle_notes || null,
      })
      .select('id')
      .single()
    vehicleId = vehicle?.id ?? null
  }

  // Property Profiles (Tier 1): a property is created alongside the
  // inquiry rather than through a standalone screen — see
  // 019_property_profiles.sql.
  let propertyId: string | null = null
  const hasPropertyFields = property_address || property_gate_code || property_parking_instructions || property_pets_on_site || property_access_notes || property_preferred_service_day || property_lawn_size || property_snow_removal_areas || property_cleaning_instructions || property_safety_notes
  if (hasPropertyFields && hasComponent(client.enabled_components, 'property_profiles')) {
    const { data: property } = await supabase
      .from('properties')
      .insert({
        client_id,
        customer_id: customerId,
        address: property_address || null,
        gate_code: property_gate_code || null,
        parking_instructions: property_parking_instructions || null,
        pets_on_site: property_pets_on_site || null,
        access_notes: property_access_notes || null,
        preferred_service_day: property_preferred_service_day || null,
        lawn_size: property_lawn_size || null,
        snow_removal_areas: property_snow_removal_areas || null,
        cleaning_instructions: property_cleaning_instructions || null,
        safety_notes: property_safety_notes || null,
      })
      .select('id')
      .single()
    propertyId = property?.id ?? null
  }

  const { data: inquiry, error: inquiryError } = await supabase
    .from('inquiries')
    .insert({
      client_id,
      customer_id: customerId,
      service_category: service_category || null,
      job_location: job_location || null,
      urgency: urgency || null,
      description: description || null,
      photo_urls: photo_urls ?? [],
      preferred_contact_method: preferred_contact_method || null,
      vehicle_id: vehicleId,
      property_id: propertyId,
    })
    .select('id')
    .single()

  if (inquiryError || !inquiry) {
    return NextResponse.json({ error: 'Failed to save inquiry' }, { status: 500 })
  }

  // Fire-and-forget: the inquiry is already saved, so notification delivery
  // shouldn't block the customer-facing response on two Resend round-trips.
  sendInquiryEmails(supabase, {
    clientId: client_id,
    operatorEmail: client.operator_email,
    fromName: getBrandingAppName(client.client_branding) ?? 'Your Local Seller',
    customerId,
    customerName: name,
    customerPhone: normalizedPhone,
    customerEmail: email || null,
    serviceCategory: service_category || null,
    jobLocation: job_location || null,
    urgency: urgency || null,
    description: description || null,
    preferredContactMethod: preferred_contact_method || null,
  }).catch((err) => console.error('inquiry notification dispatch failed', err))

  return NextResponse.json({ inquiry_id: inquiry.id }, { status: 201 })
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

async function sendInquiryEmails(
  supabase: ReturnType<typeof createServiceClient>,
  info: {
    clientId: string
    operatorEmail: string | null
    fromName: string
    customerId: string
    customerName: string
    customerPhone: string | null
    customerEmail: string | null
    serviceCategory: string | null
    jobLocation: string | null
    urgency: string | null
    description: string | null
    preferredContactMethod: string | null
  }
) {
  const resend = new Resend(process.env.RESEND_API_KEY)

  const sendOwnerEmail = async () => {
    if (!info.operatorEmail) return
    try {
      const { data } = await resend.emails.send({
        from: `${info.fromName} <${FROM_ADDRESS}>`,
        to: info.operatorEmail,
        subject: `New inquiry${info.serviceCategory ? `: ${info.serviceCategory}` : ''}`,
        html: ownerEmailTemplate(info),
        text: ownerEmailText(info),
      })

      await supabase.from('notification_log').insert({
        client_id: info.clientId,
        customer_id: info.customerId,
        channel: 'email',
        message_preview: `New inquiry from ${info.customerName}`.substring(0, 50),
        status: 'sent',
        provider_message_id: data?.id ?? null,
      })
    } catch (err) {
      console.error('inquiry owner email failed', err)
    }
  }

  const sendCustomerEmail = async () => {
    if (!info.customerEmail) return
    try {
      const { data } = await resend.emails.send({
        from: `${info.fromName} <${FROM_ADDRESS}>`,
        to: info.customerEmail,
        subject: `We received your request`,
        html: customerEmailTemplate(info.fromName),
        text: `Thanks for reaching out to ${info.fromName}! We received your request and will be in touch soon.`,
      })

      await supabase.from('notification_log').insert({
        client_id: info.clientId,
        customer_id: info.customerId,
        channel: 'email',
        message_preview: 'Inquiry confirmation',
        status: 'sent',
        provider_message_id: data?.id ?? null,
      })
    } catch (err) {
      console.error('inquiry customer confirmation email failed', err)
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
  serviceCategory: string | null
  jobLocation: string | null
  urgency: string | null
  description: string | null
  preferredContactMethod: string | null
}): string {
  return [
    `New inquiry from ${info.customerName}`,
    info.serviceCategory && `Service: ${info.serviceCategory}`,
    info.jobLocation && `Location: ${info.jobLocation}`,
    info.urgency && `Urgency: ${info.urgency}`,
    info.description && `Details: ${info.description}`,
    info.preferredContactMethod && `Preferred contact: ${info.preferredContactMethod}`,
    info.customerPhone && `Phone: ${info.customerPhone}`,
    info.customerEmail && `Email: ${info.customerEmail}`,
  ]
    .filter(Boolean)
    .join('\n')
}

function ownerEmailTemplate(info: Parameters<typeof ownerEmailText>[0]): string {
  const rows = [
    ['Service', info.serviceCategory],
    ['Location', info.jobLocation],
    ['Urgency', info.urgency],
    ['Preferred contact', info.preferredContactMethod],
    ['Phone', info.customerPhone],
    ['Email', info.customerEmail],
  ].filter(([, v]) => v)

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1f2937;">
  <h2 style="margin: 0 0 16px; font-size: 20px; color: #111827;">New inquiry from ${escapeHtml(info.customerName)}</h2>
  <table style="font-size: 15px; line-height: 1.6; border-collapse: collapse;">
    ${rows.map(([k, v]) => `<tr><td style="padding: 2px 12px 2px 0; color: #6b7280;">${escapeHtml(k as string)}</td><td>${escapeHtml(v as string)}</td></tr>`).join('')}
  </table>
  ${info.description ? `<p style="font-size: 15px; line-height: 1.6; white-space: pre-wrap; margin-top: 16px;">${escapeHtml(info.description)}</p>` : ''}
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
  <p style="font-size: 15px; line-height: 1.6;">Thanks for reaching out! We received your request and will be in touch soon.</p>
</body>
</html>
  `.trim()
}
