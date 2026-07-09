import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { FontTheme } from '@/lib/supabase/types'

const FONT_THEMES: FontTheme[] = ['modern_sans', 'farmhouse', 'classic_serif', 'minimal', 'rustic']

async function requireAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.app_metadata?.role === 'shawcliffe_admin'
}

export async function GET(req: NextRequest, { params }: { params: { clientId: string } }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createServiceClient()
  const { data: branding, error } = await admin
    .from('client_branding')
    .select('*')
    .eq('client_id', params.clientId)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ branding })
}

// Visual identity fields only — custom_domain*, apple_bundle_id, android_package,
// theme_version are owned by the custom-domain wizard / native build tooling.
export async function PATCH(req: NextRequest, { params }: { params: { clientId: string } }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const {
    primary_color, secondary_color, accent_color, font_theme,
    logo_url, app_icon_url, splash_url, app_name, tagline, hero_photo_urls,
  } = body

  if (font_theme !== undefined && !FONT_THEMES.includes(font_theme)) {
    return NextResponse.json({ error: 'Invalid font_theme' }, { status: 400 })
  }
  if (typeof app_name === 'string' && app_name.length > 30) {
    return NextResponse.json({ error: 'app_name must be 30 characters or fewer' }, { status: 400 })
  }
  if (typeof tagline === 'string' && tagline.length > 80) {
    return NextResponse.json({ error: 'tagline must be 80 characters or fewer' }, { status: 400 })
  }

  const admin = createServiceClient()
  const { error } = await admin
    .from('client_branding')
    .update({
      primary_color, secondary_color, accent_color, font_theme,
      logo_url, app_icon_url, splash_url, app_name, tagline, hero_photo_urls,
    })
    .eq('client_id', params.clientId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
