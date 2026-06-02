import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// QR code redirect: shawcliffe.ca/q/{slug} → /{slug}/signup
// Short URL is stable even if the slug or domain changes — just update this redirect target.
export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  const supabase = createServiceClient()
  const { data: client } = await supabase
    .from('clients')
    .select('id, active')
    .eq('slug', params.slug)
    .single()

  if (!client || !client.active) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  return NextResponse.redirect(new URL(`/${params.slug}/signup`, req.url))
}
