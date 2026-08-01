// One-shot polish: replace the brand-coloured SVG hero placeholder with a real,
// vertical-appropriate photo for each demo client. Curated source URLs live in
// demo-data.mjs (HERO_PHOTOS) — single source of truth; seed-demos.mjs's
// materialize() already points hero_photo_urls at the same storage path, so a
// later full reseed won't revert this.
//
// Reuses the creds-loading + Storage-upload pattern from seed-demos.mjs.
// Idempotent: same source URL -> same storage path (upsert) -> same DB value.
// If a download fails, that client is skipped and keeps its existing hero
// (never blocks the rest).
//
// Run: node scripts/seed-demo-heroes.mjs

import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { CLIENTS, clientId, imageUrl, BUCKET, HERO_PHOTOS } from './demo-data.mjs'

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
const url = env.NEXT_PUBLIC_SUPABASE_URL
const supabase = createClient(url, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const rows = []
for (const client of CLIENTS) {
  const src = HERO_PHOTOS[client.slug]
  if (!src) { rows.push({ slug: client.slug, result: 'skipped (no curated photo)' }); continue }

  try {
    const res = await fetch(src)
    if (!res.ok) throw new Error(`download failed: ${res.status}`)
    const buf = Buffer.from(await res.arrayBuffer())

    const { error: uploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(`${client.slug}/hero-0.jpg`, buf, { contentType: 'image/jpeg', upsert: true })
    if (uploadErr) throw new Error(`storage upload: ${uploadErr.message}`)

    const { error: dbErr } = await supabase
      .from('client_branding')
      .update({ hero_photo_urls: [imageUrl(url, client.slug, 'hero', 0, 'jpg')] })
      .eq('client_id', clientId(client.n))
    if (dbErr) throw new Error(`client_branding update: ${dbErr.message}`)

    rows.push({ slug: client.slug, result: `OK (${(buf.length / 1024).toFixed(0)} KB)` })
  } catch (e) {
    rows.push({ slug: client.slug, result: `kept SVG — ${e.message}` })
  }
}

console.table(rows)
