import { NextRequest, NextResponse } from 'next/server'
import { getAuthedUser, createServiceClient } from '@/lib/supabase/server'
import { hasComponent } from '@/lib/components'

const STATUSES = ['new', 'contacted', 'quoted', 'won', 'lost'] as const

// Seller-facing read of the inquiries table, mirrors api/seller/customers/route.ts.
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
  const status = searchParams.get('status')?.trim()
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

  if (!hasComponent(client?.enabled_components, 'inquiry_quote_form')) {
    return NextResponse.json({ error: 'Component not enabled' }, { status: 403 })
  }

  let query = admin
    .from('inquiries')
    .select('id, customer_id, service_category, job_location, urgency, description, photo_urls, preferred_contact_method, status, created_at, vehicle_id, property_id', { count: 'exact' })
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (status && (STATUSES as readonly string[]).includes(status)) {
    query = query.eq('status', status)
  }

  const { data, error, count } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const customerIds = Array.from(new Set((data ?? []).map(i => i.customer_id)))
  const { data: customers } = customerIds.length
    ? await admin.from('customers').select('id, name, phone, email').eq('client_id', clientId).in('id', customerIds)
    : { data: [] }
  const customerById = new Map((customers ?? []).map(c => [c.id, c]))

  const vehicleIds = Array.from(new Set((data ?? []).map(i => i.vehicle_id).filter(Boolean)))
  const { data: vehicles } = vehicleIds.length
    ? await admin.from('vehicles').select('id, make, model, year, vin, plate, mileage').eq('client_id', clientId).in('id', vehicleIds)
    : { data: [] }
  const vehicleById = new Map((vehicles ?? []).map(v => [v.id, v]))

  const propertyIds = Array.from(new Set((data ?? []).map(i => i.property_id).filter(Boolean)))
  const { data: properties } = propertyIds.length
    ? await admin.from('properties').select('id, address, gate_code, parking_instructions, pets_on_site, access_notes, preferred_service_day, lawn_size, snow_removal_areas, cleaning_instructions, safety_notes').eq('client_id', clientId).in('id', propertyIds)
    : { data: [] }
  const propertyById = new Map((properties ?? []).map(p => [p.id, p]))

  const inquiries = (data ?? []).map(({ customer_id, vehicle_id, property_id, ...rest }) => ({
    ...rest,
    customer: customerById.get(customer_id) ?? null,
    vehicle: vehicle_id ? (vehicleById.get(vehicle_id) ?? null) : null,
    property: property_id ? (propertyById.get(property_id) ?? null) : null,
  }))

  return NextResponse.json({ inquiries, total: count ?? 0, page, pageSize })
}
