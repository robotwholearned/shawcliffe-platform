import { NextRequest, NextResponse } from 'next/server'
import { getAuthedUser, createServiceClient } from '@/lib/supabase/server'

// Seller-facing read of clients.enabled_components. The clients table is
// service_role_only (002_rls_policies.sql), so seller surfaces can't SELECT it
// with their own JWT — they authenticate here (cookie session or Bearer token)
// and this route reads it with the service client, scoped to their own client_id.
// Consumed by useEnabledComponents (web) and ComponentsService (iOS/Android seller).
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

  const admin = createServiceClient()
  const { data, error } = await admin
    .from('clients')
    .select('enabled_components')
    .eq('id', clientId)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ enabled_components: data?.enabled_components ?? [] })
}
