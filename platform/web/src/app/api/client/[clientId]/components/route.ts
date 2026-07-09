import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// Public read of clients.enabled_components for anonymous, single-tenant
// customer apps (android-customer/ios-customer) that have no Supabase
// session — only their client_id, baked in at build time. No auth check:
// client_id isn't a secret and this returns nothing but feature keys.
export async function GET(req: NextRequest, { params }: { params: { clientId: string } }) {
  const admin = createServiceClient()
  const { data, error } = await admin
    .from('clients')
    .select('enabled_components')
    .eq('id', params.clientId)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

  return NextResponse.json({ enabled_components: data.enabled_components ?? [] })
}
