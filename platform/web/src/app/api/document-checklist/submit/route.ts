import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { normalizePhone } from '@/lib/phone'
import { hasComponent } from '@/lib/components'
import { Resend } from 'resend'

const FROM_ADDRESS = 'cassandra@shawcliffedigital.com'
const CONSENT_TEXT_VERSION = 'v1-document-checklist-2026-07-09'

// Same size/type ceiling as api/inquiry/photos, extended to PDFs since
// checklist items commonly ask for documents (waivers, intake forms), not
// just photos.
const MAX_FILE_BYTES = 8 * 1024 * 1024 // 8MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/heic', 'image/webp', 'application/pdf']

export async function POST(req: NextRequest) {
  const formData = await req.formData().catch(() => null)
  const clientId = formData?.get('client_id')
  const name = formData?.get('name')
  const phone = formData?.get('phone')
  const email = formData?.get('email')
  const smsConsent = formData?.get('sms_consent') === 'true'
  const emailConsent = formData?.get('email_consent') === 'true'
  const checklistItemId = formData?.get('checklist_item_id')
  const file = formData?.get('file')

  if (typeof clientId !== 'string' || !clientId) {
    return NextResponse.json({ error: 'client_id is required' }, { status: 400 })
  }
  if (typeof name !== 'string' || !name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }
  const phoneStr = typeof phone === 'string' ? phone : ''
  const emailStr = typeof email === 'string' ? email : ''
  if (!phoneStr && !emailStr) {
    return NextResponse.json({ error: 'phone or email is required' }, { status: 400 })
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'file is required' }, { status: 400 })
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 })
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: 'File too large' }, { status: 400 })
  }

  const normalizedPhone = phoneStr ? normalizePhone(phoneStr) : null
  if (phoneStr && !normalizedPhone) {
    return NextResponse.json({ error: 'Invalid phone number format' }, { status: 400 })
  }

  const admin = createServiceClient()

  const { data: client } = await admin
    .from('clients')
    .select('id, operator_email, enabled_components, client_branding(app_name)')
    .eq('id', clientId)
    .eq('active', true)
    .single()

  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  }
  if (!hasComponent(client.enabled_components, 'document_checklist_intake')) {
    return NextResponse.json({ error: 'Component not enabled' }, { status: 403 })
  }

  // Hash IP for CASL/TCPA logging — we never store the raw IP
  const forwarded = req.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown'
  const ipHash = await hashIp(ip)

  // Find or create customer — same pattern as api/inquiry and api/booking.
  const safeEmail = emailStr.replace(/[,()]/g, '')
  const safePhone = (normalizedPhone ?? '').replace(/[,()]/g, '')
  let customerId: string
  const { data: existingCustomer } = await admin
    .from('customers')
    .select('id')
    .eq('client_id', clientId)
    .or(`email.eq.${safeEmail},phone.eq.${safePhone}`)
    .maybeSingle()

  if (existingCustomer) {
    customerId = existingCustomer.id
  } else {
    const { data: newCustomer, error: customerError } = await admin
      .from('customers')
      .insert({
        client_id: clientId,
        name,
        phone: normalizedPhone,
        email: emailStr || null,
        sms_consent: smsConsent,
        email_consent: emailConsent,
        signup_source: 'app',
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

  const ext = file.type === 'application/pdf' ? 'pdf' : (file.type.split('/')[1] === 'jpeg' ? 'jpg' : file.type.split('/')[1])
  const path = `${clientId}/documents/${crypto.randomUUID()}.${ext}`

  const { error: uploadError } = await admin.storage
    .from('assets')
    .upload(path, await file.arrayBuffer(), { contentType: file.type })

  if (uploadError) {
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }

  const { data: publicUrl } = admin.storage.from('assets').getPublicUrl(path)

  const { data: submission, error: submissionError } = await admin
    .from('document_submissions')
    .insert({
      client_id: clientId,
      customer_id: customerId,
      checklist_item_id: typeof checklistItemId === 'string' && checklistItemId ? checklistItemId : null,
      file_url: publicUrl.publicUrl,
    })
    .select('id')
    .single()

  if (submissionError || !submission) {
    return NextResponse.json({ error: 'Failed to save submission' }, { status: 500 })
  }

  if (client.operator_email) {
    const fromName = getBrandingAppName(client.client_branding) ?? 'Your Local Seller'
    sendOwnerNotification(admin, {
      clientId,
      operatorEmail: client.operator_email,
      fromName,
      customerId,
      customerName: name,
    }).catch((err) => console.error('document submission notification dispatch failed', err))
  }

  return NextResponse.json({ submission_id: submission.id, url: publicUrl.publicUrl }, { status: 201 })
}

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

async function sendOwnerNotification(
  admin: ReturnType<typeof createServiceClient>,
  info: { clientId: string; operatorEmail: string; fromName: string; customerId: string; customerName: string }
) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  try {
    const { data } = await resend.emails.send({
      from: `${info.fromName} <${FROM_ADDRESS}>`,
      to: info.operatorEmail,
      subject: `New document submitted`,
      html: `<p style="font-family: system-ui, sans-serif; font-size: 15px;">${info.customerName} submitted a document. Check the seller dashboard's Documents tab to view it.</p>`,
      text: `${info.customerName} submitted a document. Check the seller dashboard's Documents tab to view it.`,
    })

    await admin.from('notification_log').insert({
      client_id: info.clientId,
      customer_id: info.customerId,
      channel: 'email',
      message_preview: `Document submitted by ${info.customerName}`.substring(0, 50),
      status: 'sent',
      provider_message_id: data?.id ?? null,
    })
  } catch (err) {
    console.error('document submission owner email failed', err)
  }
}
