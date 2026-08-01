# Shawcliffe Seller (iOS)

Native SwiftUI seller admin app — Phase 3 of the platform PRD. Mirrors
`platform/web/src/app/seller/page.tsx`: status toggle, product status
updates, and preorder view, talking directly to the same Supabase project
via the `supabase-swift` SDK (no custom backend).

## Setup

```bash
cd platform/ios-seller
open ShawcliffeSeller.xcodeproj
```

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
- SMS + email + push broadcast (`BroadcastView`), calling the deployed
  `/api/broadcast/sms`, `/api/broadcast/email`, and `/api/broadcast/push`
  Next.js routes with the session's access token as a Bearer header. Those
  routes previously only accepted cookie auth (`@supabase/ssr`) — added
  `getAuthedUser()` in `platform/web/src/lib/supabase/server.ts` to accept
  either, so this works without touching Twilio/Resend/APNs secrets on-device.

## Known gaps / not yet built

- No offline cache (SwiftData).
- Push send is unverified end-to-end — needs `APNS_TEAM_ID`/`APNS_KEY_ID`/
  `APNS_PRIVATE_KEY` set on the server (paid Apple Developer account
  required) and a real device with the customer app installed to receive it.
- No app icon / launch screen assets — placeholder only.
- Not yet tested against a real signed-in seller session (need seller
  credentials to exercise the full login → dashboard flow on device/simulator).
