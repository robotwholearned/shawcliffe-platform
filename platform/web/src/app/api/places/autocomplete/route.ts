import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const input = req.nextUrl.searchParams.get('input')

  if (!input) {
    return NextResponse.json({ error: 'input is required' }, { status: 400 })
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
