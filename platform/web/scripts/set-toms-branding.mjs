// Sets demo logo/hero/brand color on Tom's Produce client_branding row.
// Run from platform/web:  node --env-file=.env.local scripts/set-toms-branding.mjs
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const { data: clients, error: findErr } = await sb
  .from('clients')
  .select('id, slug, business_name')
  .ilike('business_name', '%tom%')

if (findErr) throw findErr
if (!clients?.length) {
  console.error('No client matching "tom" found. Clients table may use a different name.')
  process.exit(1)
}
if (clients.length > 1) {
  console.error('Multiple matches, refusing to guess:', clients.map(c => c.slug))
  process.exit(1)
}

const client = clients[0]
console.log(`Updating branding for ${client.business_name} (${client.slug})`)

const { error: upsertErr } = await sb
  .from('client_branding')
  .upsert(
    {
      client_id: client.id,
      logo_url: '/demo/toms-produce-logo.png',
      hero_photo_urls: ['/demo/toms-produce-hero.png'],
      primary_color: '#2F7D4F',
    },
    { onConflict: 'client_id' }
  )

if (upsertErr) throw upsertErr
console.log(`Done. Open http://localhost:3000/${client.slug} to see it.`)
