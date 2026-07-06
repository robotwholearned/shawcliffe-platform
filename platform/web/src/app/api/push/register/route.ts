import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// Public endpoint, no auth — same trust model as /api/signup and
// /api/preorder. Customers don't have sessions (see
// platform/ARCHITECTURE-MAP.md), so the app can only prove it owns a given
// customer_id by having received it from a prior /api/signup response.
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { client_id, customer_id, token, platform, environment } = body

  if (!client_id || !customer_id || !token || !platform) {
    return NextResponse.json({ error: 'client_id, customer_id, token, and platform are required' }, { status: 400 })
  }
  if (platform !== 'ios' && platform !== 'android') {
    return NextResponse.json({ error: 'platform must be "ios" or "android"' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { data: customer } = await supabase
    .from('customers')
    .select('id')
    .eq('client_id', client_id)
    .eq('id', customer_id)
    .single()

  if (!customer) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
  }

  // Registering a token only happens after the OS grants permission, so it's
  // the only consent signal these apps currently produce — see R5.10.
  await supabase.from('customers').update({ push_consent: true }).eq('client_id', client_id).eq('id', customer_id)

  const { error } = await supabase
    .from('push_tokens')
    .upsert(
      {
        client_id,
        customer_id,
        platform,
        token,
        environment: platform === 'ios' ? (environment ?? 'sandbox') : null,
        last_seen_at: new Date().toISOString(),
        invalidated_at: null,
      },
      { onConflict: 'client_id,token' }
    )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
