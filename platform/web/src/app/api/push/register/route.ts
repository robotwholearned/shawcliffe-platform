import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// Public endpoint, no auth — same trust model as /api/signup and
// /api/preorder. Customers don't have sessions (see
// platform/ARCHITECTURE-MAP.md), so the app can only prove it owns a given
// customer_id by having received it from a prior /api/signup response.
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { client_id, customer_id, token } = body

  if (!client_id || !customer_id || !token) {
    return NextResponse.json({ error: 'client_id, customer_id, and token are required' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('customers')
    .update({ apns_token: token })
    .eq('client_id', client_id)
    .eq('id', customer_id)
    .select('id')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}
