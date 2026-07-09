import { NextRequest, NextResponse } from 'next/server'
import { getAuthedUser, createServiceClient } from '@/lib/supabase/server'
import { hasComponent } from '@/lib/components'

// Seller-facing read of the customers table. RLS lets client_staff SELECT their
// own rows directly, but search/pagination is simpler server-side, and this
// mirrors the api/seller/components auth pattern (Bearer token or cookie).
export async function GET(req: NextRequest) {
  const user = await getAuthedUser(req)
  const role = user?.app_metadata?.role
  const clientId = user?.app_metadata?.client_id

  if (!user || (role !== 'client_staff' && role !== 'shawcliffe_admin')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!clientId) {
    return NextResponse.json({ error: 'client_id required' }, { status: 400 })
  }

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim()
  const page = Math.max(0, parseInt(searchParams.get('page') ?? '0', 10) || 0)
  const pageSize = 25
  const from = page * pageSize
  const to = from + pageSize - 1

  const admin = createServiceClient()

  const { data: client } = await admin
    .from('clients')
    .select('enabled_components')
    .eq('id', clientId)
    .single()

  if (!hasComponent(client?.enabled_components, 'customer_database')) {
    return NextResponse.json({ error: 'Component not enabled' }, { status: 403 })
  }

  let query = admin
    .from('customers')
    .select('id, name, phone, email, sms_consent, email_consent, push_consent, whatsapp_consent, signup_source, product_interests, consent_timestamp', { count: 'exact' })
    .eq('client_id', clientId)
    .order('consent_timestamp', { ascending: false })
    .range(from, to)

  if (q) {
    query = query.or(`name.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%`)
  }

  const { data, error, count } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ customers: data ?? [], total: count ?? 0, page, pageSize })
}
