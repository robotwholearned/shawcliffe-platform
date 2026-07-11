import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'

export async function GET(req: NextRequest) {
  const placeId = req.nextUrl.searchParams.get('place_id')
  const clientId = req.nextUrl.searchParams.get('client_id')

  if (!placeId) {
    return NextResponse.json({ error: 'place_id is required' }, { status: 400 })
  }
  if (!clientId) {
    return NextResponse.json({ error: 'client_id is required' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('id', clientId)
    .eq('active', true)
    .single()

  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  }

  if (!checkRateLimit(`places:${clientId}`)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const url = new URL('https://maps.googleapis.com/maps/api/place/details/json')
  url.searchParams.set('place_id', placeId)
  url.searchParams.set('fields', 'formatted_address,place_id')
  url.searchParams.set('key', process.env.GOOGLE_PLACES_API_KEY ?? '')

  const res = await fetch(url)
  const data = await res.json()

  if (data.status !== 'OK') {
    return NextResponse.json({ error: 'Failed to fetch place details' }, { status: 502 })
  }

  return NextResponse.json({
    formatted_address: data.result?.formatted_address ?? null,
    place_id: data.result?.place_id ?? null,
  })
}
