// Verifies all 12 demo storefronts against live Supabase using the exact same
// read path as platform/web/src/app/[slug]/page.tsx (clients+client_branding,
// today's daily_status, products) plus the enabled_components gating check.
// Read-only, service-role (same client the SSR page uses). No network server
// needed — this IS the storefront's data path.
//
// Run: node scripts/verify-demo-routes.mjs

import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { CLIENTS, DEFAULT_COMPONENTS } from './demo-data.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const WEB_DIR = join(HERE, '..', 'platform', 'web')

function loadEnv() {
  const raw = readFileSync(join(WEB_DIR, '.env.local'), 'utf8')
  const env = {}
  for (const line of raw.split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim()
  }
  return env
}

const env = loadEnv()
const require = createRequire(join(WEB_DIR, 'package.json'))
const { createClient } = require('@supabase/supabase-js')
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const today = new Date().toISOString().split('T')[0]
const rows = []

for (const c of CLIENTS) {
  const { data: client } = await supabase
    .from('clients')
    .select('id, business_name, active, enabled_components, client_branding(primary_color, logo_url, tagline, hero_photo_urls)')
    .eq('slug', c.slug)
    .eq('active', true)
    .single()

  if (!client) {
    rows.push({ slug: c.slug, ok: 'MISSING/404', notes: 'no active clients row' })
    continue
  }

  const [{ data: status }, { data: products }] = await Promise.all([
    supabase.from('daily_status').select('*, locations(*)').eq('client_id', client.id).eq('date', today).maybeSingle(),
    supabase.from('products').select('*').eq('client_id', client.id).order('sort_order'),
  ])

  const branding = client.client_branding
  const expected = DEFAULT_COMPONENTS[c.vertical] ?? []
  const componentsMatch = expected.every((k) => (client.enabled_components ?? []).includes(k))

  const notes = []
  if (!branding?.hero_photo_urls?.[0]) notes.push('no hero')
  if (!branding?.tagline) notes.push('no tagline')
  if (!branding?.logo_url) notes.push('no logo')
  if (!products || products.length === 0) notes.push('no products')
  if (!status) notes.push('no daily_status for today')
  if (!componentsMatch) notes.push('enabled_components mismatch')

  rows.push({
    slug: c.slug,
    vertical: c.vertical,
    ok: notes.length === 0 ? 'OK' : 'THIN',
    products: products?.length ?? 0,
    status: status?.status ?? '-',
    hero: branding?.hero_photo_urls?.[0]?.split('/').pop() ?? '-',
    leadSurface: c.leadSurface,
    notes: notes.join('; ') || '-',
  })
}

console.table(rows)
const thin = rows.filter((r) => r.ok !== 'OK')
if (thin.length) {
  console.log(`${thin.length} thin/missing route(s):`, thin.map((r) => r.slug).join(', '))
  process.exit(1)
} else {
  console.log('All 12 demo routes verified populated.')
}
