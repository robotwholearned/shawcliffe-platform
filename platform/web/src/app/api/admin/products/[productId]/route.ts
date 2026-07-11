import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

async function requireAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user?.app_metadata?.role !== 'shawcliffe_admin') return null
  return user
}

export async function PATCH(req: NextRequest, { params }: { params: { productId: string } }) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { client_id, name, category, price, bundle_description, status, available_count, quantity_limit, hold_until, image_url, notes, sort_order } = await req.json()
  if (!client_id) return NextResponse.json({ error: 'client_id required' }, { status: 400 })

  const admin = createServiceClient()
  const { error } = await admin
    .from('products')
    .update({ name, category, price, bundle_description, status, available_count, quantity_limit, hold_until, image_url, notes, sort_order })
    .eq('client_id', client_id)
    .eq('id', params.productId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: { productId: string } }) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { client_id } = await req.json()
  if (!client_id) return NextResponse.json({ error: 'client_id required' }, { status: 400 })

  const admin = createServiceClient()
  const { error } = await admin
    .from('products')
    .delete()
    .eq('client_id', client_id)
    .eq('id', params.productId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
