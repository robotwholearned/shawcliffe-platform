# Demo Clients Seed

12 realistic showcase clients — **one per `vertical` archetype** — with enough
data that each public storefront (`/{slug}`) and the seller/admin side look
genuinely populated. Marked only by the `demo-*` slug prefix (no `is_demo`
column).

Single source of truth: [`../../../scripts/demo-data.mjs`](../../../scripts/demo-data.mjs).
Applier + SQL generator: [`../../../scripts/seed-demos.mjs`](../../../scripts/seed-demos.mjs).

## Slugs & fixed UUIDs

| # | slug | vertical | lead surface | client UUID |
|---|------|----------|--------------|-------------|
| 1 | `demo-salon` | personal_care_appointment | bookings | `d0d00000-0000-0000-0000-000000000001` |
| 2 | `demo-trades` | home_service_trades | inquiries | `…02` |
| 3 | `demo-maker` | food_producers_specialty_makers | preorders | `…03` |
| 4 | `demo-popup` | mobile_popup_sellers | preorders | `…04` |
| 5 | `demo-pet` | pet_animal_services | bookings (+pets) | `…05` |
| 6 | `demo-vehicle` | vehicle_equipment_services | inquiries (+vehicles) | `…06` |
| 7 | `demo-creative` | creative_event_services | inquiries | `…07` |
| 8 | `demo-education` | education_coaching_instruction | bookings | `…08` |
| 9 | `demo-health` | health_adjacent_professionals | bookings (+doc checklist) | `…09` |
| 10 | `demo-retail` | local_retail_boutique | preorders (holds) | `…0a` |
| 11 | `demo-pro` | professional_local_services | inquiries (+doc checklist) | `…0b` |
| 12 | `demo-property` | home_property_maintenance | inquiries (+properties) | `…0c` |

Client UUID for client _N_ is `d0d00000-0000-0000-0000-0000000000` + N as 2 hex
digits. Child rows use `d0d0<table><client>-<row>-0000-0000-000000000000`
(scheme documented in `demo-data.mjs`). All deterministic, so re-runs upsert.

> Note: `demo-education` enables `student_profiles`, but there is no `students`
> table in the schema, so no profile rows are seeded for it (only booking
> activity). `demo-retail` has no lead-capture component; it uses preorders as
> believable in-store "holds/reservations".

## How to seed

### Node applier (also uploads imagery — **preferred**)

```bash
node scripts/seed-demos.mjs
```

Reads `platform/web/.env.local` (`NEXT_PUBLIC_SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`), creates the public `demo-assets` Storage bucket,
uploads the generated SVG images, then upserts every row (service-role).
Idempotent — safe to re-run; row counts stay stable. Uses `@supabase/supabase-js`
already installed under `platform/web/node_modules` (no new deps).

### SQL mirror

```bash
node scripts/seed-demos.mjs --emit-sql   # regenerates demo_clients.sql
```

Then apply [`demo_clients.sql`](./demo_clients.sql) via the Supabase SQL editor
(paste) or `supabase db push` / `psql` (needs the DB password). It's a single
idempotent transaction (`ON CONFLICT DO UPDATE`).

**The SQL does not populate Storage** — run the Node applier once so the
`demo-assets` bucket exists and the `hero`/`logo`/`product` image URLs resolve,
or those images 404.

## Imagery

Brand-coloured **SVG placeholders** generated in `seed-demos.mjs` (gradients from
each client's own primary/secondary/accent colours, with the business/product
name). Zero network dependency, fully deterministic. Uploaded to the public
`demo-assets` bucket at stable paths (`<slug>/hero-0.svg`, `<slug>/logo-0.svg`,
`<slug>/product-<i>.svg`). To use real photos, overwrite the same storage paths
(or point `products.image_url` / `client_branding.hero_photo_urls` elsewhere).

## CURRENT_DATE caveat

`daily_status.date` is set to today at apply time (`CURRENT_DATE` in SQL,
`new Date()` in the applier). The storefront only shows the "open" status on the
day you seed. **Re-run the seed** to refresh the date (upsert keeps one
always-today row per client). Add a daily cron only if the demos become
long-lived sales assets.

## Native builds (simulator/emulator only — TODO: filled by iOS/Android lanes)

Each client's `apple_bundle_id` / `android_package` are seeded as
`com.shawcliffe.demo.<name>` (e.g. `com.shawcliffe.demo.salon`). Native demos are
parameterized single-project builds (no per-client project copies), simulator-only
until code-signing clears.

- **iOS** (representative: `demo-salon`, `demo-maker`):
  ```
  TODO: fastlane build_simulator client_id:d0d00000-0000-0000-0000-000000000001 slug:demo-salon bundle_id:com.shawcliffe.demo.salon app_name:"Fern & Fox"
  ```
- **Android** (representative: `demo-pet`, `demo-property`):
  ```
  TODO: ./gradlew assembleDebug -Pclient_id=… -Pslug=… -Papp_name=…
  ```
