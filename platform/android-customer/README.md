# Tom's Produce / Shawcliffe Customer (Android)

Native Kotlin/Jetpack Compose customer-facing app — Android counterpart to
`platform/ios-customer`. Mirrors `platform/web/src/app/[slug]/*`: storefront
(status/location/products), signup, and preorder, for the same pilot client
(Tom's Produce) the web app, seller admin app, and iOS customer app already
serve.

## Setup

```bash
cd platform/android-customer
# Open in Android Studio (Ladybug+), let Gradle sync, then Run.
# Or from the CLI once a Gradle wrapper jar is present:
./gradlew installDebug
```

This project doesn't check in the Gradle wrapper jar (`gradle/wrapper/gradle-wrapper.jar`)
or a generated `local.properties` — both are produced automatically the first
time the project is opened in Android Studio.

Requires `minSdk 26` (Android 8.0).

## Architecture

- **Reads** (branding, status, location, products) go straight to Supabase via
  `supabase-kt` with the anon key — those tables have `public_read` RLS
  policies, same as the anonymous website visitor.
- **Writes** (signup, preorder) go through the same `/api/signup` and
  `/api/preorder` Next.js routes the website form and iOS app use, because
  `customers` and `preorders` only allow inserts from `service_role` or
  `client_staff` — the anon key can't write to them directly. No auth needed;
  they're public endpoints.
- **Client scoping**: `clients` itself is `service_role_only` in RLS, so
  there's no way for the app to resolve a slug to a `client_id` on its own.
  Per Phase 1 of `platform/ARCHITECTURE-MAP.md` Decision 2 (one app build per
  client, tenant baked in at compile time), `Config.CLIENT_ID` is hardcoded
  to Tom's Produce (`c40569c6-1324-47a9-979f-6d076c4b67fc`).

## What's built (v1)

- Storefront: logo, tagline, status badge, location + map link, hours,
  product list — refreshed by 5s polling (same as the iOS app; not a live
  Realtime subscription — see below)
- Signup form (name, phone/email, SMS/email consent) → `/api/signup`
- Preorder form (product quantity steppers, contact details, notes) →
  `/api/preorder`, including the 409 "Reservation Full" case
- Push scaffolding: `PushMessagingService` + `PushManager` persist the
  `customer_id` returned by signup (SharedPreferences, mirroring the iOS
  app's UserDefaults use) and attempt to register an FCM token via
  `POST /api/push/register` once both pieces exist

## Known gaps / not yet built

- **Push is wired end-to-end.** `push_tokens` (migration 009) stores tokens
  per platform, `platform/web/src/app/api/push/register/route.ts` accepts
  `platform: "android"` and stores FCM tokens there, and
  `platform/web/src/app/api/broadcast/push/route.ts` dispatches Android
  tokens via `platform/web/src/lib/fcm.ts` (FCM HTTP v1) alongside the
  existing APNs path for iOS. `google-services.json` + the `google-services`
  Gradle plugin are in place here; `FCM_SERVICE_ACCOUNT_JSON` needs to be set
  on the Render server for sends to actually go out.
- **Launcher icon is a placeholder vector**, not real app art or the
  per-client logo.
- No offline cache (Room).
- Not built/run in this environment — no Gradle wrapper jar or Android SDK
  license acceptance was available here. Needs a first open in Android Studio
  to confirm it compiles and to exercise the storefront → signup/preorder
  flow on a device/emulator.
- Polling, not Realtime — same known gap as the iOS app (PRD R2.2/R2.3).
- Single hardcoded client — not yet wired into a per-client build pipeline
  (PRD R9).
