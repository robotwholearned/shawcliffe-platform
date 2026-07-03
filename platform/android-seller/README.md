# Shawcliffe Seller (Android)

Native Kotlin/Jetpack Compose seller admin app — Android counterpart to
`platform/ios-seller`. Mirrors `platform/web/src/app/seller/page.tsx`: status
toggle, product status updates, and preorder view, talking directly to the
same Supabase project via `supabase-kt` (no custom backend).

## Setup

```bash
cd platform/android-seller
# Open in Android Studio (Ladybug+), let Gradle sync, then Run.
# Or from the CLI once a Gradle wrapper jar is present:
./gradlew installDebug
```

This project doesn't check in the Gradle wrapper jar (`gradle/wrapper/gradle-wrapper.jar`)
or a generated `local.properties` — both are produced automatically the first
time the project is opened in Android Studio. If you need the CLI wrapper
before then, run `gradle wrapper` once with a local Gradle 8.11+ install.

Requires `minSdk 26` (Android 8.0), matching the `supabase-kt` client and
Compose Material 3 baseline.

Supabase URL + anon key are embedded in `Config.kt`, pointed at the same
project as `platform/web/.env.local` and `platform/ios-seller`. The anon key
is public by design; RLS (see `platform/supabase/migrations/002_rls_policies.sql`)
is what actually restricts access — a signed-in user only sees/writes rows
where `client_id` matches their `app_metadata.client_id` and
`app_metadata.role = 'client_staff'`.

## What's built (v1)

- Email/password login against Supabase Auth
- Today's Status toggle (6 states)
- Product list: add, delete, and set available/low/sold-out
- End of Day (status → closed, all products → sold_out)
- Preorder list (read + confirm/cancel) — joined client-side across
  `preorders` / `preorder_items` / `customers`, same reasoning as the iOS app
  (composite FKs make PostgREST's automatic embed resolution unreliable)
- SMS + email + push broadcast, calling the deployed `/api/broadcast/sms`,
  `/api/broadcast/email`, and `/api/broadcast/push` Next.js routes with the
  session's access token as a Bearer header

## Known gaps / not yet built

- **Launcher icon is a placeholder vector**, not real app art.
- No offline cache (Room).
- Push broadcast send is unverified end-to-end for Android customers — see
  `platform/android-customer/README.md` for why (server only speaks APNs
  today; `customers.fcm_token` isn't wired up yet).
- Not built/run in this environment — no Gradle wrapper jar or Android SDK
  license acceptance was available here. Needs a first open in Android Studio
  to confirm it compiles and to exercise the login → dashboard flow on a
  device/emulator with real seller credentials.
- Bundle ID (`ca.shawcliffe.seller`) mirrors the iOS bundle prefix
  (`ca.shawcliffe`) but isn't yet registered with a Play Console listing.
