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

- **Hero photos: real, vertical-appropriate photographs** (Unsplash, free-license),
  one per client, defined in the `HERO_PHOTOS` slug→URL map in `demo-data.mjs` and
  uploaded to `demo-assets/<slug>/hero-0.jpg`. `client_branding.hero_photo_urls`
  points at these. Fetch/upload is idempotent — run
  `node scripts/seed-demo-heroes.mjs` to (re)apply them.
- **Logos + product thumbnails: brand-coloured SVG placeholders** generated in
  `seed-demos.mjs` (gradients from each client's own primary/secondary/accent
  colours). Zero network, fully deterministic. Stable paths
  `demo-assets/<slug>/logo-0.svg`, `<slug>/product-<i>.svg`.

To change any image, overwrite the same storage path (or repoint
`products.image_url` / `client_branding.hero_photo_urls`). The `--emit-sql`
mirror reflects whatever `demo-data.mjs` currently references
(hero-0.jpg for all 12 today).

## CURRENT_DATE caveat

`daily_status.date` is set to today at apply time (`CURRENT_DATE` in SQL,
`new Date()` in the applier). The storefront only shows the "open" status on the
day you seed. **Re-run the seed** to refresh the date (upsert keeps one
always-today row per client). Add a daily cron only if the demos become
long-lived sales assets.

## Native builds (simulator/emulator only)

Each client's `apple_bundle_id` / `android_package` are seeded as
`com.shawcliffe.demo.<name>` (e.g. `com.shawcliffe.demo.salon`). Native demos are
**parameterized single-project builds** (no per-client project copies),
simulator/emulator-only until code-signing clears. Swap the four values
(`client_id` / `slug` / bundle / app name) for any of the 12 demo clients.

### iOS (`platform/ios-customer/`)

Verified command (raw `xcodebuild` — runs today, no fastlane needed):

```bash
cd platform/ios-customer
xcodebuild -project ShawcliffeCustomer.xcodeproj -scheme ShawcliffeCustomer \
  -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' build \
  CLIENT_ID=d0d00000-0000-0000-0000-000000000001 \
  CLIENT_SLUG=demo-salon \
  CLIENT_BUNDLE_ID=com.shawcliffe.demo.salon \
  'CLIENT_APP_NAME=Fern & Fox Hair Studio'
```

**Run a demo from Xcode (no CLI):** open `ShawcliffeCustomer.xcodeproj` and pick a
`demo-*` scheme from the toolbar dropdown, then hit ▶ — one shared scheme per demo
sets `CLIENT_ID`/`CLIENT_SLUG` as Run env vars, which a DEBUG build reads (see
`SupabaseClient.swift`). The `ShawcliffeCustomer` scheme runs the default client.
Regenerate the schemes after changing the client list:
`node scripts/gen-ios-schemes.mjs`.

The client values are passed as `xcodebuild KEY=value` build settings (resolved
into Info.plist via `$(VAR)` placeholders). The Fastlane wrapper forwards the same
four via `xcargs` (run `bundle install` in `platform/ios-customer` first; not
exercised in this environment):

```bash
bundle exec fastlane build_simulator client_id:d0d00000-0000-0000-0000-000000000001 \
  slug:demo-salon bundle_id:com.shawcliffe.demo.salon app_name:"Fern & Fox Hair Studio"
```

## TestFlight (sales team demo app)

For putting the demos on a real device via TestFlight, there's **one app, not
twelve**: a single "Shawcliffe Demos" build (bundle id **`ca.shawcliffe.demo`**)
that ships with `DEMO_MODE=YES`. On launch it shows an **in-app picker of all 12
demo businesses** — tap one to open that storefront, tap back ("‹ Shawcliffe
Demos") to switch to another, anytime. No per-client builds, one TestFlight
upload for the whole sales team.

`DEMO_MODE` is a build setting that defaults to **`NO`** in both Debug and
Release, so **every other build is completely unchanged**: Tom's Produce, the 12
per-client `demo-*` schemes, and the raw `xcodebuild` commands above all still
produce single-client apps. Only the `demo_testflight` lane (and the "Shawcliffe
Demos" Xcode scheme, for running the picker locally) turn it on.

The client list the picker shows is generated from `demo-data.mjs`. Regenerate +
commit it after changing the clients:

```bash
node scripts/gen-ios-demo-list.mjs   # writes ShawcliffeCustomer/DemoClients.generated.swift
```

### Prerequisites (one-time, done by you — needs the Apple account)

1. **Create the App Store Connect app record** for bundle id `ca.shawcliffe.demo`
   (App Store Connect → Apps → +, pick the `ca.shawcliffe.demo` identifier;
   register the App ID in the Developer portal first if it doesn't exist).
2. **Give Fastlane an App Store Connect API key** (used for both signing and
   upload; the `demo_testflight` lane reads it via `app_store_connect_api_key`).
   In App Store Connect → **Users and Access → Integrations → App Store Connect
   API**, create a key (Admin or App Manager role) and note its **Key ID** and
   the page's **Issuer ID**; download the **`AuthKey_<KeyID>.p8`** (one-time).
   Then, in `platform/ios-customer/`:
   ```bash
   cp fastlane/.env.example fastlane/.env       # .env is gitignored
   # put the .p8 next to it, e.g. fastlane/AuthKey_2X9R4HXF34.p8
   # edit fastlane/.env → ASC_KEY_ID, ASC_ISSUER_ID, ASC_KEY_FILEPATH
   ```
   `.env` and `*.p8` are gitignored — the key never gets committed. The lane uses
   automatic signing (`CODE_SIGN_STYLE=Automatic`, `DEVELOPMENT_TEAM=M5SD2YQ3QM`),
   and the API key lets it create/download the distribution profile headlessly.

### Build + upload

```bash
cd platform/ios-customer
bundle install                       # first time only, installs fastlane
bundle exec fastlane demo_testflight
```

That archives with `CLIENT_BUNDLE_ID=ca.shawcliffe.demo`,
`CLIENT_APP_NAME='Shawcliffe Demos'`, `DEMO_MODE=YES`, then
`upload_to_testflight` (skips waiting for processing). Signing and the upload
need your Apple credentials from the prerequisites above; the lane will fail at
the signing/upload step without them.

### Android (`platform/android-customer/`)

Verified command (Gradle properties feed `BuildConfig` / `applicationId` /
`app_name`):

```bash
cd platform/android-customer
./gradlew assembleDebug \
  -PclientId=d0d00000-0000-0000-0000-000000000001 \
  -PclientSlug=demo-salon \
  -PclientApplicationId=com.shawcliffe.demo.salon \
  -PclientAppName="Fern & Fox Hair Studio"
```

Firebase/`google-services.json` only registers the real Tom's Produce package, so
demo builds skip Firebase wiring (push is inert, by design). If a stale Gradle
config-cache trips the build, append `--no-configuration-cache`. Fastlane wrapper
(`bundle exec fastlane android build_debug client_id:… slug:… application_id:… app_name:…`)
forwards the same properties (not exercised in this environment).
