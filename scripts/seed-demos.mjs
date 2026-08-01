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

function logoSvg(c) {
  const b = c.branding
  const mono = c.business_name.replace(/[^A-Za-z ]/g, '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
  return `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
<rect width="256" height="256" rx="48" fill="${b.primary_color}"/>
<text x="128" y="128" dy="0.36em" text-anchor="middle" font-family="Georgia, serif" font-size="120" fill="#ffffff">${xml(mono)}</text>
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
if (EMIT_SQL) {
  emitSql(env.NEXT_PUBLIC_SUPABASE_URL || 'https://YOUR-PROJECT.supabase.co')
} else {
  apply(env).catch((e) => { console.error('SEED FAILED:', e.message); process.exit(1) })
}
