# Shawcliffe Customer (iOS)

Native SwiftUI customer-facing app — Phase 3 of the platform PRD. Mirrors
`platform/web/src/app/[slug]/*`: storefront (status/location/products),
signup, and preorder, for the same pilot client (Tom's Produce) the web app
and seller admin app already serve.

## Setup

```bash
brew install xcodegen   # one-time
cd platform/ios-customer
xcodegen generate
open ShawcliffeCustomer.xcodeproj
```

The `.xcodeproj` is generated from `project.yml` and is gitignored — regenerate
it after pulling changes to `project.yml` or after adding/removing source files.

## Architecture

- **Reads** (branding, status, location, products) go straight to Supabase via
  `supabase-swift` with the anon key — those tables have `public_read` RLS
  policies, same as the anonymous website visitor.
- **Writes** (signup, preorder) go through the same `/api/signup` and
  `/api/preorder` Next.js routes the website form uses, because `customers`
  and `preorders` only allow inserts from `service_role` or `client_staff` —
  the anon key can't write to them directly. No auth needed for these; they're
  public endpoints, just like the web forms.
- **Client scoping**: `clients` itself is `service_role_only` in RLS, so
  there's no way for the app to resolve a slug to a `client_id` on its own.
  Per Phase 1 of `platform/ARCHITECTURE-MAP.md` Decision 2 (one app build per
  client, tenant baked in at compile time), `Config.clientId` is hardcoded to
  Tom's Produce (`c40569c6-1324-47a9-979f-6d076c4b67fc`). A real Fastlane
  per-client pipeline (PRD R9.1) would inject this at build time instead.

## What's built (v1)

- Storefront: logo, tagline, status badge, location + map link, hours,
  product list — refreshed by 5s polling (not a live Realtime subscription;
  see below)
- Signup form (name, phone/email, SMS/email consent) → `/api/signup`
- Preorder form (product quantity steppers, contact details, notes) →
  `/api/preorder`, including the 409 "Reservation Full" case
- Push notifications: on launch, requests permission and registers for
  remote notifications (`AppDelegate` + `PushManager`); after a successful
  signup, the returned `customer_id` is persisted (`UserDefaults`) and paired
  with the device token via `POST /api/push/register`. Customers have no
  session (see `platform/ARCHITECTURE-MAP.md`), so this pairing only happens
  once the app has both pieces — deferred to the next launch if the token
  arrives before signup does. Delivery is direct APNs (`apns2` on the
  server), not Firebase — see the Notifications section of
  `platform/ARCHITECTURE-MAP.md` for why.

## Known gaps / not yet built

- **Polling, not Realtime.** The web app subscribes to
  `tenant:{client_id}:status` / `:products` channels and only falls back to
  5s polling if the socket drops (PRD R2.2/R2.3). This app polls every 5s
  unconditionally — same end-to-end latency in practice, but doesn't use
  `supabase-swift`'s Realtime API. Worth switching once the Realtime API
  surface has been checked against the installed SDK version.
- No app icon / launch screen assets — placeholder only.
- No offline cache (SwiftData).
- Push isn't verified end-to-end — needs a paid Apple Developer account (APNs
  `.p8` key) and a real device; Simulator can't generate real device tokens.
  Confirmed via `xcrun simctl push` that permission request, registration,
  and foreground notification display all work client-side.
- Single hardcoded client — not yet wired into a Fastlane multi-client build
  pipeline (PRD R9).
