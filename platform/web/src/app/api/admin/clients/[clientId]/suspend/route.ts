import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest, { params }: { params: { clientId: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user?.app_metadata?.role !== 'shawcliffe_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createServiceClient()

  // Verify client exists
  const { data: client } = await admin
    .from('clients')
    .select('id, business_name, active')
    .eq('id', params.clientId)
    .single()

  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

  // Mark inactive — customer-facing surfaces check active=true
  const { error } = await admin
    .from('clients')
    .update({ active: false })
    .eq('id', params.clientId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, message: `${client.business_name} suspended. Data retained.` })
}
