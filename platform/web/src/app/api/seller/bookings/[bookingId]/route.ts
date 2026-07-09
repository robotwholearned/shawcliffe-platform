import { NextRequest, NextResponse } from 'next/server'
import { getAuthedUser, createServiceClient } from '@/lib/supabase/server'
import { hasComponent } from '@/lib/components'

const STATUSES = ['requested', 'confirmed', 'declined', 'completed', 'cancelled'] as const
type Status = (typeof STATUSES)[number]

// Seller updates a booking's status. Scoped to the authed seller's client_id
// via the .eq chain below, so a wrong/foreign id just matches zero rows.
export async function PATCH(req: NextRequest, { params }: { params: { bookingId: string } }) {
  const user = await getAuthedUser(req)
  const role = user?.app_metadata?.role
  const clientId = user?.app_metadata?.client_id

  if (!user || (role !== 'client_staff' && role !== 'shawcliffe_admin')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!clientId) {
    return NextResponse.json({ error: 'client_id required' }, { status: 400 })
  }

  const body = await req.json().catch(() => ({}))
  const status = body.status
  if (!STATUSES.includes(status as Status)) {
    return NextResponse.json({ error: `status must be one of ${STATUSES.join(', ')}` }, { status: 400 })
  }

  const admin = createServiceClient()

  const { data: client } = await admin
    .from('clients')
    .select('enabled_components')
    .eq('id', clientId)
    .single()

  if (!hasComponent(client?.enabled_components, 'booking_request_system')) {
    return NextResponse.json({ error: 'Component not enabled' }, { status: 403 })
  }

  const { data, error } = await admin
    .from('bookings')
    .update({ status })
    .eq('client_id', clientId)
    .eq('id', params.bookingId)
    .select('id, status')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })

  return NextResponse.json({ ok: true, booking: data })
}
