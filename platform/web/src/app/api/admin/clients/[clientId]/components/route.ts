import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { COMPONENT_KEYS, type ComponentKey } from '@/lib/components'

// Admin sets which components are enabled for a client.
export async function PATCH(req: NextRequest, { params }: { params: { clientId: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user?.app_metadata?.role !== 'shawcliffe_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const incoming = body.enabled_components
  if (!Array.isArray(incoming) || !incoming.every((k) => COMPONENT_KEYS.includes(k as ComponentKey))) {
    return NextResponse.json({ error: 'enabled_components must be an array of valid component keys' }, { status: 400 })
  }
  const enabled_components = Array.from(new Set(incoming as ComponentKey[]))

  const admin = createServiceClient()
  const { error } = await admin
    .from('clients')
    .update({ enabled_components })
    .eq('id', params.clientId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, enabled_components })
}
