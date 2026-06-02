import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { client_id, customer_name, customer_phone, customer_email, items, pickup_window_start, pickup_window_end, notes } = body

  if (!client_id || !customer_name || (!customer_phone && !customer_email) || !items?.length) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Verify client is active
  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('id', client_id)
    .eq('active', true)
    .single()

  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

  // Check quantity caps for each product
  for (const item of items as { product_id: string; quantity: number }[]) {
    const { data: product } = await supabase
      .from('products')
      .select('quantity_limit, name')
      .eq('client_id', client_id)
      .eq('id', item.product_id)
      .single()

    if (!product) {
      return NextResponse.json({ error: `Product not found` }, { status: 404 })
    }

    if (product.quantity_limit != null) {
      // Count existing pending/confirmed preorder quantities for this product
      const { data: existingItems } = await supabase
        .from('preorder_items')
        .select('quantity, preorders!inner(status)')
        .eq('client_id', client_id)
        .eq('product_id', item.product_id)
        .in('preorders.status', ['pending', 'confirmed'])

      const reserved = (existingItems ?? []).reduce((sum: number, r: any) => sum + r.quantity, 0)
      if (reserved + item.quantity > product.quantity_limit) {
        return NextResponse.json(
          { error: `Reservation Full`, product: product.name },
          { status: 409 }
        )
      }
    }
  }

  // Find or create customer record
  const ipHash = 'preorder-no-ip'
  let customerId: string

  const emailOrPhone = customer_email || customer_phone
  const { data: existingCustomer } = await supabase
    .from('customers')
    .select('id')
    .eq('client_id', client_id)
    .or(`email.eq.${customer_email ?? ''},phone.eq.${customer_phone ?? ''}`)
    .maybeSingle()

  if (existingCustomer) {
    customerId = existingCustomer.id
  } else {
    const { data: newCustomer, error: customerError } = await supabase
      .from('customers')
      .insert({
        client_id,
        name: customer_name,
        phone: customer_phone || null,
        email: customer_email || null,
        sms_consent: false,
        email_consent: false,
        signup_source: 'website',
        consent_text_version: 'v1-preorder-2026-06-02',
        consent_ip_hash: ipHash,
      })
      .select('id')
      .single()

    if (customerError || !newCustomer) {
      return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 })
    }
    customerId = newCustomer.id
  }

  // Create preorder
  const { data: preorder, error: preorderError } = await supabase
    .from('preorders')
    .insert({
      client_id,
      customer_id: customerId,
      pickup_window_start: pickup_window_start || null,
      pickup_window_end: pickup_window_end || null,
      notes: notes || null,
      status: 'pending',
    })
    .select('id')
    .single()

  if (preorderError || !preorder) {
    return NextResponse.json({ error: 'Failed to create preorder' }, { status: 500 })
  }

  // Insert preorder items
  const itemRows = (items as { product_id: string; quantity: number }[]).map(item => ({
    client_id,
    preorder_id: preorder.id,
    product_id: item.product_id,
    quantity: item.quantity,
  }))

  const { error: itemsError } = await supabase.from('preorder_items').insert(itemRows)
  if (itemsError) {
    return NextResponse.json({ error: 'Failed to save preorder items' }, { status: 500 })
  }

  return NextResponse.json({ preorder_id: preorder.id }, { status: 201 })
}
