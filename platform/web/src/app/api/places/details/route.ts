import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const placeId = req.nextUrl.searchParams.get('place_id')

  if (!placeId) {
    return NextResponse.json({ error: 'place_id is required' }, { status: 400 })
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
