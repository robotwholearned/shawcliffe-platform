import { NextRequest, NextResponse } from 'next/server'
import { getAuthedUser, createServiceClient } from '@/lib/supabase/server'
import { hasComponent } from '@/lib/components'

// Seller-facing read of document_submissions, mirrors api/seller/inquiries/route.ts.
// No status field — status tracking on submissions is Premium-tier scope
// (Ops Guide 3.21), not built here.
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

  if (!hasComponent(client?.enabled_components, 'document_checklist_intake')) {
    return NextResponse.json({ error: 'Component not enabled' }, { status: 403 })
  }

  const { data, error, count } = await admin
    .from('document_submissions')
    .select('id, customer_id, checklist_item_id, file_url, submitted_at', { count: 'exact' })
    .eq('client_id', clientId)
    .order('submitted_at', { ascending: false })
    .range(from, to)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const customerIds = Array.from(new Set((data ?? []).map(s => s.customer_id)))
  const { data: customers } = customerIds.length
    ? await admin.from('customers').select('id, name, phone, email').eq('client_id', clientId).in('id', customerIds)
    : { data: [] }
  const customerById = new Map((customers ?? []).map(c => [c.id, c]))

  const itemIds = Array.from(new Set((data ?? []).map(s => s.checklist_item_id).filter(Boolean)))
  const { data: items } = itemIds.length
    ? await admin.from('document_checklist_items').select('id, title').eq('client_id', clientId).in('id', itemIds)
    : { data: [] }
  const itemById = new Map((items ?? []).map(i => [i.id, i]))

  const submissions = (data ?? []).map(({ customer_id, checklist_item_id, ...rest }) => ({
    ...rest,
    customer: customerById.get(customer_id) ?? null,
    checklist_item: checklist_item_id ? (itemById.get(checklist_item_id) ?? null) : null,
  }))

  return NextResponse.json({ submissions, total: count ?? 0, page, pageSize })
}
