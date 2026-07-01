# Shawcliffe Seller (iOS)

Native SwiftUI seller admin app — Phase 3 of the platform PRD. Mirrors
`platform/web/src/app/seller/page.tsx`: status toggle, product status
updates, and preorder view, talking directly to the same Supabase project
via the `supabase-swift` SDK (no custom backend).

## Setup

```bash
brew install xcodegen   # one-time
cd platform/ios-seller
xcodegen generate
open ShawcliffeSeller.xcodeproj
```

The `.xcodeproj` is generated from `project.yml` and is gitignored — regenerate
it after pulling changes to `project.yml` or after adding/removing source files.

Supabase URL + anon key are embedded in `ShawcliffeSeller/SupabaseClient.swift`,
pointed at the same project as `platform/web/.env.local`. The anon key is
public by design; RLS (see `platform/supabase/migrations/002_rls_policies.sql`)
is what actually restricts access — a signed-in user only sees/writes rows
where `client_id` matches their `app_metadata.client_id` and
`app_metadata.role = 'client_staff'`.

## What's built (v1)

- Email/password login against Supabase Auth
- Today's Status toggle (6 states)
- Product list: add, delete, and set available/low/sold-out
- End of Day (status → closed, all products → sold_out)
- Preorder list (read + confirm/cancel) — joined client-side across
  `preorders` / `preorder_items` / `customers` since the composite FKs on
  those tables make PostgREST's automatic embed resolution unreliable
- SMS + email broadcast (`BroadcastView`), calling the deployed
  `/api/broadcast/sms` and `/api/broadcast/email` Next.js routes with the
  session's access token as a Bearer header. Those routes previously only
  accepted cookie auth (`@supabase/ssr`) — added `getAuthedUser()` in
  `platform/web/src/lib/supabase/server.ts` to accept either, so this works
  without touching Twilio/Resend secrets on-device.

## Known gaps / not yet built

- No offline cache (SwiftData), no push notifications (APNs) yet — later PRD
  Phase 3 items.
- No app icon / launch screen assets — placeholder only.
- Not yet tested against a real signed-in seller session (need seller
  credentials to exercise the full login → dashboard flow on device/simulator).
