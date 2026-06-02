import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

const CONSENT_TEXT_VERSION = 'v1-2026-06-02'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { client_id, name, phone, email, sms_consent, email_consent, signup_source } = body

  if (!client_id || !name || (!phone && !email)) {
    return NextResponse.json({ error: 'name and phone or email are required' }, { status: 400 })
  }
  if (!sms_consent && !email_consent) {
    return NextResponse.json({ error: 'at least one consent is required' }, { status: 400 })
  }

  // Hash IP for CASL/TCPA logging — we never store the raw IP
  const forwarded = req.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown'
  const ipHash = await hashIp(ip)

  const supabase = createServiceClient()

  // Verify client exists and is active
  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('id', client_id)
    .eq('active', true)
    .single()

  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  }

  const { data, error } = await supabase
    .from('customers')
    .insert({
      client_id,
      name,
      phone: phone || null,
      email: email || null,
      sms_consent: sms_consent ?? false,
      email_consent: email_consent ?? false,
      signup_source: signup_source ?? 'website',
      consent_text_version: CONSENT_TEXT_VERSION,
      consent_ip_hash: ipHash,
      consent_timestamp: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error) {
    console.error('signup error', error)
    return NextResponse.json({ error: 'Failed to save signup' }, { status: 500 })
  }

  return NextResponse.json({ id: data.id }, { status: 201 })
}

async function hashIp(ip: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(ip + process.env.SUPABASE_SERVICE_ROLE_KEY)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')
}
