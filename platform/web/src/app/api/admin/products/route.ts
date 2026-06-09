import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user?.app_metadata?.role !== 'shawcliffe_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { client_id, name, category, price, bundle_description, quantity_limit, sort_order } = body

  if (!client_id || !name) {
    return NextResponse.json({ error: 'client_id and name are required' }, { status: 400 })
  }

  const admin = createServiceClient()
  const { data: product, error } = await admin
    .from('products')
    .insert({ client_id, name, category, price, bundle_description, quantity_limit, sort_order: sort_order ?? 0 })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ product }, { status: 201 })
}
