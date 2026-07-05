import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import twilio from 'twilio'

const STATUS_MAP: Record<string, string> = {
  PENDING_REVIEW: 'pending_review',
  IN_REVIEW: 'in_review',
  TWILIO_APPROVED: 'approved',
  TWILIO_REJECTED: 'rejected',
}

async function loadSubaccount(admin: ReturnType<typeof createServiceClient>, clientId: string) {
  const { data } = await admin
    .from('twilio_subaccounts')
    .select('account_sid, auth_token, phone_number_sid, toll_free_verification_sid')
    .eq('client_id', clientId)
    .single()
  return data
}

// Submits the Twilio Toll-Free Verification profile for this client's number.
// Required fields per Twilio's Tollfree Verification API — see
// https://www.twilio.com/docs/messaging/api/tollfree-verification-resource
export async function POST(req: NextRequest, { params }: { params: { clientId: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user?.app_metadata?.role !== 'shawcliffe_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const required = [
    'businessName', 'businessWebsite', 'notificationEmail', 'useCaseCategories',
    'useCaseSummary', 'productionMessageSample', 'optInImageUrls', 'optInType', 'messageVolume',
  ]
  const missing = required.filter(f => body[f] === undefined || body[f] === null || body[f] === '')
  if (missing.length > 0) {
    return NextResponse.json({ error: `Missing required field(s): ${missing.join(', ')}` }, { status: 400 })
  }

  const admin = createServiceClient()
  const twilioAccount = await loadSubaccount(admin, params.clientId)

  if (!twilioAccount) {
    return NextResponse.json({ error: 'No Twilio subaccount for this client yet' }, { status: 404 })
  }
  if (!twilioAccount.phone_number_sid) {
    return NextResponse.json({ error: 'Buy a toll-free number for this client before submitting verification' }, { status: 400 })
  }

  const client = twilio(twilioAccount.account_sid, twilioAccount.auth_token)

  let verification
  try {
    verification = await client.messaging.v1.tollfreeVerifications.create({
      businessName: body.businessName,
      businessWebsite: body.businessWebsite,
      notificationEmail: body.notificationEmail,
      useCaseCategories: body.useCaseCategories,
      useCaseSummary: body.useCaseSummary,
      productionMessageSample: body.productionMessageSample,
      optInImageUrls: body.optInImageUrls,
      optInType: body.optInType,
      messageVolume: body.messageVolume,
      tollfreePhoneNumberSid: twilioAccount.phone_number_sid,
      businessStreetAddress: body.businessStreetAddress,
      businessStreetAddress2: body.businessStreetAddress2,
      businessCity: body.businessCity,
      businessStateProvinceRegion: body.businessStateProvinceRegion,
      businessPostalCode: body.businessPostalCode,
      businessCountry: body.businessCountry,
      businessContactFirstName: body.businessContactFirstName,
      businessContactLastName: body.businessContactLastName,
      businessContactEmail: body.businessContactEmail,
      businessContactPhone: body.businessContactPhone,
      additionalInformation: body.additionalInformation,
    })
  } catch (err: any) {
    return NextResponse.json({ error: `Twilio: ${err.message}` }, { status: 502 })
  }

  const { error } = await admin
    .from('twilio_subaccounts')
    .update({
      toll_free_verification_sid: verification.sid,
      verification_status: STATUS_MAP[verification.status] ?? 'pending_review',
      verification_submitted_at: new Date().toISOString(),
      verification_updated_at: new Date().toISOString(),
      verification_detail: verification.toJSON(),
    })
    .eq('client_id', params.clientId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, sid: verification.sid, status: STATUS_MAP[verification.status] })
}

// Refreshes the current status from Twilio.
export async function GET(req: NextRequest, { params }: { params: { clientId: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user?.app_metadata?.role !== 'shawcliffe_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createServiceClient()
  const twilioAccount = await loadSubaccount(admin, params.clientId)

  if (!twilioAccount?.toll_free_verification_sid) {
    return NextResponse.json({ error: 'No verification submitted yet for this client' }, { status: 404 })
  }

  const client = twilio(twilioAccount.account_sid, twilioAccount.auth_token)

  let verification
  try {
    verification = await client.messaging.v1.tollfreeVerifications(twilioAccount.toll_free_verification_sid).fetch()
  } catch (err: any) {
    return NextResponse.json({ error: `Twilio: ${err.message}` }, { status: 502 })
  }

  const { error } = await admin
    .from('twilio_subaccounts')
    .update({
      verification_status: STATUS_MAP[verification.status] ?? 'pending_review',
      verification_updated_at: new Date().toISOString(),
      verification_detail: verification.toJSON(),
    })
    .eq('client_id', params.clientId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, status: STATUS_MAP[verification.status] })
}
