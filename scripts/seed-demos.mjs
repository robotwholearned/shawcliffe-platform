// Applier + SQL generator for the 12 demo clients. Single source of truth:
// ./demo-data.mjs. Idempotent (fixed UUIDs + upsert / ON CONFLICT DO UPDATE).
//
// Run (live apply to Supabase — needs platform/web/.env.local creds + network):
//   node scripts/seed-demos.mjs
// Generate the reviewable SQL mirror (no network, no creds beyond the URL):
//   node scripts/seed-demos.mjs --emit-sql
// Both:
//   node scripts/seed-demos.mjs --emit-sql && node scripts/seed-demos.mjs
//
// @supabase/supabase-js is resolved from platform/web/node_modules (no new deps).

import { createRequire } from 'node:module'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import {
  CLIENTS, DEFAULT_COMPONENTS, BUCKET, CONSENT_VERSION, CONSENT_IP_HASH,
  uid, clientId, imageUrl, HERO_PHOTOS,
} from './demo-data.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const WEB_DIR = join(HERE, '..', 'platform', 'web')
const SQL_OUT = join(HERE, '..', 'platform', 'supabase', 'seed', 'demo_clients.sql')

const EMIT_SQL = process.argv.includes('--emit-sql')
const EMIT_LOGOS = process.argv.includes('--emit-logos')

// ─── env ─────────────────────────────────────────────────────────────────────

function loadEnv() {
  const raw = readFileSync(join(WEB_DIR, '.env.local'), 'utf8')
  const env = {}
  for (const line of raw.split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim()
  }
  return env
}

// ─── date context (concrete values for apply, raw SQL for --emit-sql) ────────

const RAW = (sql) => ({ __raw: sql })
const isDate = (v) => v && typeof v === 'object' && '__raw' in v

function makeCtx(mode) {
  const now = new Date()
  const iso = (d) => d.toISOString().slice(0, 10)
  const at = (days) => new Date(now.getTime() + days * 86400000)
  return {
    today: mode === 'sql' ? RAW('CURRENT_DATE') : iso(now),
    date: (days) => mode === 'sql' ? RAW(`CURRENT_DATE + ${days}`) : iso(at(days)),
    ts: (days) => mode === 'sql'
      ? RAW(`now() + interval '${days} days'`)
      : at(days).toISOString(),
  }
}

// ─── row materialization (shared by apply + emit-sql) ────────────────────────

const mapUrl = (addr) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`
const bundleName = (slug) => `com.shawcliffe.demo.${slug.replace(/^demo-/, '')}`

// Build every table's rows for one client. `ctx` decides date representation.
function materialize(client, url, ctx) {
  const n = client.n
  const cid = clientId(n)
  const t = {} // table -> rows[]
  const push = (table, row) => (t[table] ??= []).push(row)

  push('clients', {
    id: cid, slug: client.slug, business_name: client.business_name,
    vertical: client.vertical, tier: client.tier,
    operator_email: client.operator_email, operator_phone: client.operator_phone,
    active: true, region: 'ca',
    enabled_components: DEFAULT_COMPONENTS[client.vertical],
  })

  const b = client.branding
  // Real curated photo (uploaded by seed-demo-heroes.mjs) if this client has
  // one, else the generated SVG placeholder — keeps a full reseed from
  // reverting hero_photo_urls back to the placeholder (see HERO_PHOTOS).
  const heroUrl = HERO_PHOTOS[client.slug]
    ? imageUrl(url, client.slug, 'hero', 0, 'jpg')
    : imageUrl(url, client.slug, 'hero', 0)
  push('client_branding', {
    client_id: cid, primary_color: b.primary_color, secondary_color: b.secondary_color,
    accent_color: b.accent_color, font_theme: b.font_theme,
    logo_url: imageUrl(url, client.slug, 'logo', 0),
    app_name: b.app_name, tagline: b.tagline, hero_photo_urls: [heroUrl],
    apple_bundle_id: bundleName(client.slug), android_package: bundleName(client.slug),
  })

  const loc = client.location
  const locId = uid('locations', n, 0)
  push('locations', {
    client_id: cid, id: locId, display_name: loc.display_name, address: loc.address,
    lat: loc.lat, lng: loc.lng, map_url: mapUrl(loc.address), parking_notes: loc.parking_notes,
  })

  const s = client.status
  push('daily_status', {
    client_id: cid, id: uid('daily_status', n, 0), date: ctx.today, status: 'open',
    hours_open: s.hours_open, hours_close: s.hours_close, location_id: locId,
    custom_message: s.custom_message,
  })

  const productId = (i) => uid('products', n, i)
  client.products.forEach((p, i) => push('products', {
    client_id: cid, id: productId(i), name: p.name, category: p.category, price: p.price,
    status: p.status,
    available_count: p.status === 'sold_out' ? 0 : p.availableCount,
    image_url: imageUrl(url, client.slug, 'product', i), sort_order: i, notes: p.notes,
  }))

  const customerId = (i) => uid('customers', n, i)
  client.customers.forEach((cu, i) => push('customers', {
    client_id: cid, id: customerId(i), name: cu.name, phone: cu.phone, email: cu.email,
    sms_consent: cu.smsConsent, email_consent: !!cu.email, whatsapp_consent: false,
    signup_source: cu.signupSource, consent_text_version: CONSENT_VERSION,
    consent_ip_hash: CONSENT_IP_HASH, product_interests: cu.interests ?? [],
  }))

  // Vertical profiles (pets / vehicles / properties). Created alongside the lead
  // surface, referenced by pet_id / vehicle_id / property_id below.
  const profileId = (i) => client.profiles ? uid(client.profiles.table, n, i) : null
  if (client.profiles) {
    const { table, rows } = client.profiles
    rows.forEach((r, i) => {
      const base = { client_id: cid, id: profileId(i), customer_id: customerId(r.customer) }
      if (table === 'pets') push('pets', {
        ...base, name: r.name, breed: r.breed, size: r.size, age: r.age,
        allergies: r.allergies, behavior_notes: r.behavior_notes,
        grooming_preferences: r.grooming_preferences, vaccination_info: r.vaccination_info,
        emergency_contact: r.emergency_contact, care_instructions: r.care_instructions,
        photo_url: imageUrl(url, client.slug, 'pet', i),
      })
      else if (table === 'vehicles') push('vehicles', {
        ...base, make: r.make, model: r.model, year: r.year, color: r.color,
        vin: null, plate: null, mileage: r.mileage, notes: r.notes,
      })
      else if (table === 'properties') push('properties', {
        ...base, address: r.address, gate_code: r.gate_code,
        parking_instructions: r.parking_instructions, pets_on_site: r.pets_on_site,
        access_notes: r.access_notes, preferred_service_day: r.preferred_service_day,
        lawn_size: r.lawn_size, snow_removal_areas: r.snow_removal_areas,
        cleaning_instructions: r.cleaning_instructions, safety_notes: r.safety_notes,
        place_id: null, address_verified: false,
      })
    })
  }

  // Document checklist (static seller content — public read).
  client.docChecklist?.forEach((d, i) => push('document_checklist_items', {
    client_id: cid, id: uid('document_checklist_items', n, i), title: d.title,
    description: d.description, required: d.required, needs_upload: d.needs_upload, sort_order: i,
  }))

  // Lead-surface activity.
  client.activity.forEach((a, i) => {
    if (client.leadSurface === 'bookings') {
      push('bookings', {
        client_id: cid, id: uid('bookings', n, i), customer_id: customerId(a.customer),
        service: a.service, requested_date: ctx.date(a.dateOffset), requested_time: a.time,
        notes: a.notes, status: a.status,
        pet_id: a.pet != null ? profileId(a.pet) : null,
      })
    } else if (client.leadSurface === 'inquiries') {
      push('inquiries', {
        client_id: cid, id: uid('inquiries', n, i), customer_id: customerId(a.customer),
        service_category: a.service_category, job_location: a.job_location, urgency: a.urgency,
        description: a.description, photo_urls: [], preferred_contact_method: a.contact,
        status: a.status,
        preferred_date: a.preferredDateOffset != null ? ctx.date(a.preferredDateOffset) : null,
        vehicle_id: a.vehicle != null ? profileId(a.vehicle) : null,
        property_id: a.property != null ? profileId(a.property) : null,
      })
    } else if (client.leadSurface === 'preorders') {
      const preId = uid('preorders', n, i)
      push('preorders', {
        client_id: cid, id: preId, customer_id: customerId(a.customer), status: a.status,
        notes: a.notes,
        pickup_window_start: ctx.ts(a.pickupOffset),
        pickup_window_end: ctx.ts(a.pickupOffset + 0.125),
      })
      a.items.forEach(([pIdx, qty]) => push('preorder_items', {
        client_id: cid, preorder_id: preId, product_id: productId(pIdx), quantity: qty,
      }))
    }
  })

  return t
}

// Insert/upsert order respects FK dependencies. [table, onConflict].
const ORDER = [
  ['clients', 'id'],
  ['client_branding', 'client_id'],
  ['locations', 'client_id,id'],
  ['products', 'client_id,id'],
  ['daily_status', 'client_id,id'],
  ['customers', 'client_id,id'],
  ['vehicles', 'client_id,id'],
  ['pets', 'client_id,id'],
  ['properties', 'client_id,id'],
  ['bookings', 'client_id,id'],
  ['inquiries', 'client_id,id'],
  ['preorders', 'client_id,id'],
  ['preorder_items', 'client_id,preorder_id,product_id'],
  ['document_checklist_items', 'client_id,id'],
]

function allRows(url, ctx) {
  const tables = {}
  for (const client of CLIENTS) {
    const t = materialize(client, url, ctx)
    for (const [name, rows] of Object.entries(t)) (tables[name] ??= []).push(...rows)
  }
  return tables
}

// ─── SVG image generation (brand-coloured, deterministic, zero-network) ──────

const xml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function heroSvg(c) {
  const b = c.branding
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="${b.primary_color}"/><stop offset="1" stop-color="${b.secondary_color}"/>
</linearGradient></defs>
<rect width="1200" height="800" fill="url(#g)"/>
<circle cx="980" cy="160" r="240" fill="${b.accent_color}" opacity="0.18"/>
<circle cx="220" cy="680" r="180" fill="#ffffff" opacity="0.10"/>
<text x="80" y="700" font-family="Georgia, serif" font-size="62" fill="#ffffff" opacity="0.92">${xml(c.business_name)}</text>
<text x="82" y="748" font-family="Helvetica, Arial, sans-serif" font-size="26" fill="#ffffff" opacity="0.72">${xml(b.tagline)}</text>
</svg>`
}

function productSvg(c, name, i) {
  const b = c.branding
  const tone = i % 2 ? b.accent_color : b.secondary_color
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="${b.primary_color}"/><stop offset="1" stop-color="${tone}"/>
</linearGradient></defs>
<rect width="800" height="800" fill="url(#g)"/>
<rect x="0" y="560" width="800" height="240" fill="#000000" opacity="0.28"/>
<text x="48" y="700" font-family="Helvetica, Arial, sans-serif" font-size="42" fill="#ffffff">${xml(name)}</text>
</svg>`
}

// One emblem per vertical — a clean white glyph on the brand gradient. Drawn in
// a local 0..100 box (translated to 78,78 = centre 128) so all 12 share a
// consistent weight/position. Unknown verticals fall back to a monogram.
function glyphFor(vertical, b) {
  const accent = b.accent_color
  const primary = b.primary_color
  const stroke = 'fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"'
  switch (vertical) {
    case 'personal_care_appointment': // scissors
      return `<g ${stroke}><circle cx="20" cy="26" r="11"/><circle cx="20" cy="74" r="11"/><line x1="29" y1="32" x2="84" y2="72"/><line x1="29" y1="68" x2="84" y2="28"/></g><circle cx="47" cy="50" r="4" fill="#fff"/>`
    case 'home_service_trades': // water droplet
      return `<path d="M50 12 C50 12 78 44 78 64 a28 28 0 0 1 -56 0 C22 44 50 12 50 12 Z" fill="#fff"/><path d="M38 62 a12 12 0 0 0 8 11" ${stroke} opacity="0.55"/>`
    case 'food_producers_specialty_makers': // flame
      return `<path d="M52 10 c10 16 20 24 20 42 a22 22 0 0 1 -44 0 c0 -11 6 -17 11 -23 c1 8 5 11 8 13 c-3 -13 2 -24 5 -32 Z" fill="#fff"/><path d="M50 84 a12 12 0 0 0 12 -18 c-3 8 -7 11 -12 12 c-5 -1 -9 -4 -12 -12 a12 12 0 0 0 12 18 Z" fill="${accent}"/>`
    case 'mobile_popup_sellers': // flower
      return `<g fill="#fff"><circle cx="50" cy="28" r="13"/><circle cx="28" cy="48" r="13"/><circle cx="72" cy="48" r="13"/><circle cx="38" cy="72" r="13"/><circle cx="62" cy="72" r="13"/></g><circle cx="50" cy="52" r="12" fill="${accent}"/>`
    case 'pet_animal_services': // paw
      return `<g fill="#fff"><ellipse cx="32" cy="42" rx="8" ry="11"/><ellipse cx="52" cy="32" rx="8" ry="12"/><ellipse cx="72" cy="42" rx="8" ry="11"/><path d="M52 50 c14 0 24 12 24 22 c0 10 -11 14 -24 14 c-13 0 -24 -4 -24 -14 c0 -10 10 -22 24 -22 Z"/></g>`
    case 'vehicle_equipment_services': // car
      return `<path d="M24 58 l7 -17 a9 9 0 0 1 8 -5 h22 a9 9 0 0 1 8 5 l7 17 Z" fill="#fff"/><rect x="18" y="56" width="64" height="16" rx="7" fill="#fff"/><circle cx="34" cy="76" r="8" fill="#fff"/><circle cx="66" cy="76" r="8" fill="#fff"/><circle cx="34" cy="76" r="3.6" fill="${primary}"/><circle cx="66" cy="76" r="3.6" fill="${primary}"/>`
    case 'creative_event_services': // camera
      return `<rect x="14" y="34" width="72" height="48" rx="11" fill="#fff"/><path d="M36 34 l6 -9 h16 l6 9 Z" fill="#fff"/><circle cx="50" cy="58" r="16" fill="${primary}"/><circle cx="50" cy="58" r="8" fill="#fff"/><circle cx="74" cy="45" r="3.4" fill="${primary}"/>`
    case 'education_coaching_instruction': // music note
      return `<g fill="#fff"><ellipse cx="38" cy="72" rx="14" ry="10"/><rect x="49" y="20" width="7" height="53"/><path d="M56 20 c13 3 19 11 19 22 c-4 -9 -11 -13 -19 -13 Z"/></g>`
    case 'health_adjacent_professionals': // lotus
      return `<g fill="#fff"><path d="M50 18 c9 13 9 33 0 48 c-9 -15 -9 -35 0 -48 Z"/><path d="M50 66 C36 60 24 46 22 30 c15 4 27 17 28 34 Z"/><path d="M50 66 C64 60 76 46 78 30 c-15 4 -27 17 -28 34 Z"/></g><path d="M26 62 c14 12 34 12 48 0" ${stroke} opacity="0.6"/>`
    case 'local_retail_boutique': // shopping bag
      return `<path d="M26 40 h48 l4 44 a6 6 0 0 1 -6 6 H28 a6 6 0 0 1 -6 -6 Z" fill="#fff"/><path d="M38 40 v-6 a12 12 0 0 1 24 0 v6" ${stroke}/>`
    case 'professional_local_services': // bar chart
      return `<g fill="#fff"><rect x="24" y="52" width="14" height="30" rx="3"/><rect x="43" y="38" width="14" height="44" rx="3"/><rect x="62" y="24" width="14" height="58" rx="3"/></g><line x1="20" y1="86" x2="82" y2="86" ${stroke}/>`
    case 'home_property_maintenance': // grass blades
      return `<g fill="#fff"><path d="M50 86 C34 74 26 58 24 40 c16 8 24 26 26 46 Z"/><path d="M50 86 C48 62 48 44 53 26 c6 18 4 40 -3 60 Z"/><path d="M50 86 C66 74 74 58 76 40 c-16 8 -24 26 -26 46 Z"/></g>`
    default: { // monogram fallback
      const mono = String(b.app_name || '').replace(/[^A-Za-z ]/g, '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
      return `<text x="50" y="50" dy="0.35em" text-anchor="middle" font-family="Georgia, serif" font-size="52" fill="#fff">${xml(mono)}</text>`
    }
  }
}

function logoSvg(c) {
  const b = c.branding
  return `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
<defs>
<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${b.primary_color}"/><stop offset="1" stop-color="${b.secondary_color}"/></linearGradient>
<radialGradient id="gl" cx="0.5" cy="0.4" r="0.65"><stop offset="0" stop-color="#ffffff" stop-opacity="0.20"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient>
</defs>
<rect width="256" height="256" rx="56" fill="url(#bg)"/>
<rect width="256" height="256" rx="56" fill="url(#gl)"/>
<circle cx="128" cy="122" r="76" fill="${b.accent_color}" opacity="0.16"/>
<g transform="translate(78,78)">${glyphFor(c.vertical, b)}</g>
</svg>`
}

function imagesFor(client) {
  const imgs = [
    { path: `${client.slug}/hero-0.svg`, svg: heroSvg(client) },
    { path: `${client.slug}/logo-0.svg`, svg: logoSvg(client) },
  ]
  client.products.forEach((p, i) => imgs.push({ path: `${client.slug}/product-${i}.svg`, svg: productSvg(client, p.name, i) }))
  client.profiles?.rows.forEach((_, i) => imgs.push({ path: `${client.slug}/pet-${i}.svg`, svg: productSvg(client, 'Pet', i) }))
  return imgs
}

// ─── SQL emitter ─────────────────────────────────────────────────────────────

function sqlVal(v) {
  if (v === null || v === undefined) return 'NULL'
  if (isDate(v)) return v.__raw
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE'
  if (typeof v === 'number') return String(v)
  if (Array.isArray(v)) {
    if (v.length === 0) return `'{}'`
    return `ARRAY[${v.map((x) => `'${String(x).replace(/'/g, "''")}'`).join(', ')}]`
  }
  return `'${String(v).replace(/'/g, "''")}'`
}

function emitSql(url) {
  const ctx = makeCtx('sql')
  const tables = allRows(url, ctx)
  const conflict = Object.fromEntries(ORDER.map(([t, c]) => [t, c]))
  const out = []
  out.push('-- ==========================================================================')
  out.push('-- Shawcliffe demo clients — 12 showcase businesses, one per vertical archetype.')
  out.push('-- GENERATED FILE — do not edit by hand. Source of truth: scripts/demo-data.mjs.')
  out.push('-- Regenerate:  node scripts/seed-demos.mjs --emit-sql')
  out.push('--')
  out.push('-- Apply:  Supabase SQL editor (paste), or `supabase db push` / psql with the DB')
  out.push('--         password. Service-role only — clients/customers/etc. are RLS-protected.')
  out.push('-- Idempotent: fixed demo UUIDs + ON CONFLICT DO UPDATE. Safe to re-run; only')
  out.push('--         touches demo-* rows, never real clients.')
  out.push('--')
  out.push('-- Imagery: image_url / hero / logo point at the public `demo-assets` Storage')
  out.push('--         bucket. This SQL does NOT populate Storage — run the Node applier once')
  out.push('--         (`node scripts/seed-demos.mjs`) to upload the generated SVGs, or the')
  out.push('--         image URLs will 404. See platform/supabase/seed/README-demos.md.')
  out.push('--')
  out.push('-- CURRENT_DATE caveat: daily_status.date uses CURRENT_DATE at apply time, so the')
  out.push('--         storefront shows "open" only on the day you run this. Re-run to refresh.')
  out.push('-- ==========================================================================')
  out.push('')
  out.push('begin;')
  out.push('')
  for (const [table] of ORDER) {
    const rows = tables[table]
    if (!rows || rows.length === 0) continue
    const cols = Object.keys(rows[0])
    const keyCols = conflict[table].split(',')
    const updates = cols.filter((c) => !keyCols.includes(c)).map((c) => `${c} = excluded.${c}`)
    out.push(`-- ${table} (${rows.length})`)
    for (const row of rows) {
      const vals = cols.map((c) => sqlVal(row[c])).join(', ')
      const set = updates.length ? ` do update set ${updates.join(', ')}` : ' do nothing'
      out.push(`insert into ${table} (${cols.join(', ')}) values (${vals})`)
      out.push(`  on conflict (${keyCols.join(', ')})${set};`)
    }
    out.push('')
  }
  out.push('commit;')
  mkdirSync(dirname(SQL_OUT), { recursive: true })
  writeFileSync(SQL_OUT, out.join('\n') + '\n')
  const counts = Object.fromEntries(ORDER.map(([t]) => [t, tables[t]?.length ?? 0]))
  console.log(`Wrote ${SQL_OUT}`)
  console.table(counts)
}

// ─── live applier ────────────────────────────────────────────────────────────

async function apply(env) {
  const require = createRequire(join(WEB_DIR, 'package.json'))
  const { createClient } = require('@supabase/supabase-js')
  const url = env.NEXT_PUBLIC_SUPABASE_URL
  const key = env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in platform/web/.env.local')
  const supabase = createClient(url, key, { auth: { persistSession: false } })

  // 1. Storage bucket + images.
  const { error: bucketErr } = await supabase.storage.createBucket(BUCKET, { public: true })
  if (bucketErr && !/exist/i.test(bucketErr.message)) throw new Error(`createBucket: ${bucketErr.message}`)
  let uploaded = 0
  for (const client of CLIENTS) {
    for (const img of imagesFor(client)) {
      const { error } = await supabase.storage.from(BUCKET).upload(img.path, Buffer.from(img.svg), {
        contentType: 'image/svg+xml', upsert: true,
      })
      if (error) throw new Error(`upload ${img.path}: ${error.message}`)
      uploaded++
    }
  }
  console.log(`Uploaded ${uploaded} images to bucket "${BUCKET}".`)

  // 2. Rows, in FK order.
  const tables = allRows(url, makeCtx('apply'))
  const counts = {}
  for (const [table, onConflict] of ORDER) {
    const rows = tables[table]
    if (!rows || rows.length === 0) { counts[table] = 0; continue }
    const { error } = await supabase.from(table).upsert(rows, { onConflict })
    if (error) throw new Error(`upsert ${table}: ${error.message}`)
    counts[table] = rows.length
  }
  console.log('Upserted rows:')
  console.table(counts)
  console.log('Demo slugs:', CLIENTS.map((c) => c.slug).join(', '))
}

// ─── main ────────────────────────────────────────────────────────────────────

const env = loadEnv()
if (EMIT_LOGOS) {
  // Offline: write each client's logo SVG to ./scripts/.logo-preview/<slug>.svg
  const dir = join(HERE, '.logo-preview')
  mkdirSync(dir, { recursive: true })
  for (const c of CLIENTS) writeFileSync(join(dir, `${c.slug}.svg`), logoSvg(c))
  console.log(`Wrote ${CLIENTS.length} logo SVGs to ${dir}`)
} else if (EMIT_SQL) {
  emitSql(env.NEXT_PUBLIC_SUPABASE_URL || 'https://YOUR-PROJECT.supabase.co')
} else {
  apply(env).catch((e) => { console.error('SEED FAILED:', e.message); process.exit(1) })
}
