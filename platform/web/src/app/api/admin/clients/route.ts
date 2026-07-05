import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { RESERVED_SLUGS } from '@/lib/reserved-slugs'

export async function POST(req: NextRequest) {
  // Verify caller is a Shawcliffe admin
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user?.app_metadata?.role !== 'shawcliffe_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { slug, business_name, vertical, tier, operator_email, operator_phone, primary_color, app_name, tagline } = body

  if (!slug || !business_name || !vertical || !tier || !operator_email) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  if (RESERVED_SLUGS.has(slug)) {
    return NextResponse.json({ error: `"${slug}" is reserved and can't be used as a client slug` }, { status: 400 })
  }

  const admin = createServiceClient()

  const { data: client, error: clientError } = await admin
    .from('clients')
    .insert({ slug, business_name, vertical, tier, operator_email, operator_phone })
    .select()
    .single()

  if (clientError) {
    const isDuplicate = clientError.code === '23505'
    return NextResponse.json(
      { error: isDuplicate ? `Slug "${slug}" is already taken` : clientError.message },
      { status: isDuplicate ? 409 : 500 }
    )
  }

  await admin
    .from('client_branding')
    .insert({ client_id: client.id, primary_color: primary_color ?? '#2563eb', app_name, tagline })

  return NextResponse.json({ client }, { status: 201 })
}
