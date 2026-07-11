import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'

export async function GET(req: NextRequest) {
  const input = req.nextUrl.searchParams.get('input')
  const clientId = req.nextUrl.searchParams.get('client_id')

  if (!input) {
    return NextResponse.json({ error: 'input is required' }, { status: 400 })
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

  const url = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json')
  url.searchParams.set('input', input)
  url.searchParams.set('components', 'country:ca')
  url.searchParams.set('key', process.env.GOOGLE_PLACES_API_KEY ?? '')

  const res = await fetch(url)
  const data = await res.json()

  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    return NextResponse.json({ error: 'Failed to fetch suggestions' }, { status: 502 })
  }

  return NextResponse.json({ suggestions: data.predictions ?? [] })
}
