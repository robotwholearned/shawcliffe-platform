# Shawcliffe Platform — Architecture Map
*Translates the ChatGPT component plan into what's built, what's missing, and what to build next.*

---

## Stack (Already Decided)

| Layer | Decision | Notes |
|---|---|---|
| Frontend (web) | Next.js 14, App Router, TypeScript, Tailwind | Web storefront at `/{slug}` |
| Mobile apps | Native iOS + Android (framework TBD — see Decision 2) | White-labeled per client via `apple_bundle_id` / `android_package` |
| Delivery format | Native iOS + Android + Web | All three surfaces; each client gets their own app + URL |
| Database | Supabase Postgres | Multi-tenant: `client_id` on every table + RLS |
| Realtime | Supabase Realtime | Live product/status updates |
| Push notifications | APNs (iOS) + FCM (Android) + Web Push | Tokens already stored in `customers.apns_token` / `customers.fcm_token` |
| SMS | Twilio per-client subaccounts | Each client gets their own Twilio number — clean sender ID |
| Email | Resend | Transactional only |
| Auth | Supabase Auth | Admin-side only; customers don't log in |
| Region | `ca-central-1` | Canada-first; CASL-compliant consent (IP hashing) |
| Payments | Deferred (stub table exists) | Phase 4 — Stripe when needed |

**Delivery format is native iOS + Android + web.** The `apns_token`, `fcm_token`, `apple_bundle_id`, and `android_package` columns in the schema are correctly placed and should be treated as first-class. Push is a primary notification channel, not a nice-to-have. This also means each client's app goes through the App Store and Play Store under their own bundle ID — white-labeled publishing is part of the product.

**Open question this creates:** What framework powers the native apps? See Decision 2 below.

---

## Component Status Map

### ✅ 1. Business Profile — DONE

**What exists:**
- `client_branding` table: logo, tagline, hero photos, primary/secondary/accent colors, font theme, app name, custom domain fields
- `clients` table: slug, business name, vertical, tier, region
- `locations` table: address, lat/lng, map URL, parking notes
- Storefront `/{slug}` renders all of this with SSR + Realtime hydration

**Nothing to build here.** The profile layer is solid. Future work: admin UI to let business owners edit their own branding (currently Shawcliffe sets it).

---

### ✅ 2. Service / Product Menu — DONE

**What exists:**
- `products` table: name, category, price, status (available/low/sold_out), inventory count, image URL, sort order
- `daily_status` table: open/closed/sold_out/weather_delay etc., hours, custom message
- `RealtimeStorefront` component: live updates without page reload

**Nothing to build here.** The product + availability layer works. Future: admin UI for the business owner to manage products themselves.

---

### 🟡 3. Lead Capture / Inquiry Form — PARTIAL

**What exists:**
- `/{slug}/signup` + `/api/signup` — customer opt-in for SMS/email notifications (CASL-compliant)
- `customers` table captures name, phone, email, consent

**What's missing:** The signup form is an *opt-in*, not an *inquiry*. These are different things:

| Form Type | Purpose | Currently |
|---|---|---|
| Signup / opt-in | "Notify me when you're open" | ✅ Built |
| Inquiry / contact | "I want to ask about a service" | ❌ Missing |
| Quote request | "I need a job done, here are the details" | ❌ Missing |

**To build — Inquiry Form:**

*Schema addition:*
```sql
create table inquiries (
  client_id    uuid not null references clients(id) on delete cascade,
  id           uuid not null default gen_random_uuid(),
  customer_id  uuid,                          -- linked if they're already a customer
  name         text not null,
  phone        text,
  email        text,
  message      text not null,
  service_type text,                          -- from client's service menu
  preferred_date date,
  status       text not null default 'new'
               check (status in ('new','contacted','quoted','booked','closed')),
  source       text check (source in ('app','qr','website')),
  created_at   timestamptz not null default now(),
  primary key (client_id, id),
  foreign key (client_id, customer_id) references customers(client_id, id) on delete set null
);
```

*Routes needed:*
- `POST /api/inquiry` — saves inquiry, notifies business owner via SMS/email
- `GET /admin/clients/[clientId]/inquiries` — owner views and manages leads

*UI needed:*
- `/{slug}/contact` — inquiry form page (name, phone/email, service selector, message, optional date)
- Admin: inquiry list with status column

This one component unlocks the "lead machine" promise across almost every archetype.

---

### 🟡 4. Admin Dashboard — PARTIAL

**What exists:**
- `/admin` — Shawcliffe super-admin: client list, add new client
- `/admin/clients/[clientId]` — per-client management (scope TBD)
- `/admin/clients/new` — create a new client

**What's missing:** There are currently two different admin users who need different things:

| User | What they need | Status |
|---|---|---|
| Shawcliffe (you) | Create clients, manage all accounts | 🟡 Partially built |
| Business owner | See their leads, customers, send broadcasts | ❌ Not built |

The business owner admin doesn't exist yet. This is the dashboard the client actually logs into. It needs:

- View incoming inquiries / orders / appointments
- See their customer list
- Send a broadcast (SMS/email blast)
- Update their daily status (open/closed/location)
- Edit products

**Recommended approach:** Add a separate auth flow for business owners — a magic link or simple password tied to their `operator_email` in the `clients` table. Route them to `/dashboard` (separate from `/admin`). Keep `/admin` for Shawcliffe internal use only.

---

### 🟡 5. Customer Database / CRM — PARTIAL

**What exists:**
- `customers` table: name, phone, email, consents, push tokens, signup source, product interests
- `notification_log`: tracks every SMS/email sent

**What's missing:**
- No notes field (e.g., "prefers morning appointments," "allergic to latex")
- No tags (lead, VIP, regular, overdue)
- No last-contacted tracking
- No way for the business owner to see or search their customer list

**Schema additions needed:**
```sql
alter table customers
  add column notes       text,
  add column tags        text[]    not null default '{}',
  add column last_contacted_at timestamptz;
```

A computed `last_contacted_at` can be derived from `notification_log` — no need to manually track it.

**UI needed:**
- Customer list in the owner dashboard with search/filter
- Customer detail view: contact info, notes, past orders/appointments, last contacted

This is low-effort schema work with high CRM value.

---

### 🟡 6. Notifications — PARTIAL

**What exists:**
- SMS via Twilio per-client subaccounts ✅
- Email via Resend ✅
- **iOS push via direct APNs (token-based, `apns2` npm package) ✅** — no Firebase; see below for why
- `/api/broadcast/sms`, `/api/broadcast/email`, `/api/broadcast/push` routes ✅
- `POST /api/push/register` ✅ — public endpoint, saves the device token onto a customer row (customers don't have sessions, so the app can only prove which customer it is by having received that customer_id from a prior `/api/signup` call)
- `platform/web/src/lib/apns.ts` — one JWT-signing key (`APNS_TEAM_ID`/`APNS_KEY_ID`/`APNS_PRIVATE_KEY` env vars) covers every client's app under Shawcliffe's single Apple Developer account (Phase 1 model, Decision 2 below); per-client piece is just `apple_bundle_id` from `client_branding`, sent as the APNs topic
- Seller-facing "Send Push Notification" UI in both the web dashboard and the iOS seller app, alongside SMS/email
- `notification_log` for audit trail (channel `push`) ✅
- `customers.apns_token` column ✅, wired end-to-end client → register → send
- `customers.fcm_token` column ✅ (still unused — no Android app yet)

**Why direct APNs instead of FCM:** the original recommendation below was written when both iOS and Android were expected simultaneously, where FCM's one-endpoint-for-both-platforms is a real win. With only the iOS app built so far, going straight to APNs skips creating a Firebase project and service-account credentials entirely — Apple's token-based auth needs only one `.p8` key from the Apple Developer portal, which iOS push requires either way (FCM would need that same key uploaded to Firebase). **Revisit this when Android exists** — that's when FCM's cross-platform routing starts paying for the extra setup, per the original note below.

**Known gap:** full delivery is unverified end-to-end — it needs a paid Apple Developer account (for the APNs `.p8` key) and a real device (Simulator can't generate real device tokens, though `xcrun simctl push` was used to confirm the client-side permission/registration/foreground-display code path works).

**Also needed — Web Push:**
Add a `web_push_subscription` jsonb column to `customers` for browser push on the web surface. Not started.

```sql
alter table customers add column web_push_subscription jsonb;
```

**Original FCM-based recommendation (superseded for the iOS-only phase, revisit for Android):**

```
Push send flow:
1. Native app registers → gets FCM token (on Android) or APNs token (on iOS via FCM SDK)
2. Token saved to customers.fcm_token (or apns_token for direct APNs)
3. Server calls FCM HTTP v1 API with token + payload
4. FCM delivers to device via APNs (iOS) or FCM (Android)
```

**What to build next for notifications:**
- Android push (FCM, once the Android app exists — at that point, migrate iOS onto FCM too rather than running two providers)
- Web push (`web_push_subscription` column + Push API on the website)
- Appointment reminder triggers (when booking is built)
- Post-completion review request trigger (when review request is built)

---

### ❌ 7. Review Request — NOT BUILT

**What exists:** Nothing.

**Why it matters:** It's the easiest high-value component to sell. "After every completed job, your app asks happy customers for a Google review."

**Schema needed:**
```sql
-- Add to clients table:
alter table clients add column google_place_id text;

-- New table:
create table review_requests (
  client_id    uuid not null references clients(id) on delete cascade,
  id           uuid not null default gen_random_uuid(),
  customer_id  uuid not null,
  channel      text not null check (channel in ('sms','email')),
  sent_at      timestamptz,
  clicked_at   timestamptz,
  status       text not null default 'pending'
               check (status in ('pending','sent','clicked')),
  primary key (client_id, id),
  foreign key (client_id, customer_id) references customers(client_id, id)
);
```

**Routes needed:**
- `POST /api/review-request` — sends the SMS/email with Google review link, logs it
- `GET /api/review-request/click` — records click (redirect to Google Maps review URL)

**UI needed:**
- Owner dashboard: "Send review request" button on a completed order/appointment/inquiry
- Review request message template (editable per client)

**This is a 1–2 day build** and dramatically improves the product's perceived value.

---

### ❌ 8. Booking Request — NOT BUILT

This is the biggest missing piece and unlocks the appointment-based templates (massage, hair, pet grooming, tutoring, coaching).

**Two-phase approach — don't build full scheduling on day one:**

**Phase A: Booking Request (build now)**
Customer picks a service, preferred date/time window, and submits. Owner manually confirms. No calendar sync, no real-time availability.

```sql
create table appointments (
  client_id        uuid not null references clients(id) on delete cascade,
  id               uuid not null default gen_random_uuid(),
  customer_id      uuid not null,
  service_name     text not null,
  preferred_date   date,
  preferred_time   text,                        -- "morning", "afternoon", or "10:00 AM"
  duration_minutes int,
  notes            text,
  status           text not null default 'requested'
                   check (status in ('requested','confirmed','cancelled','completed','no_show')),
  confirmed_at     timestamptz,
  reminder_sent    boolean not null default false,
  created_at       timestamptz not null default now(),
  primary key (client_id, id),
  foreign key (client_id, customer_id) references customers(client_id, id)
);
```

*Routes needed:*
- `POST /api/appointments` — saves booking request, notifies owner via SMS
- `PATCH /api/appointments/[id]` — owner confirms/cancels, triggers customer confirmation SMS
- `POST /api/appointments/[id]/reminder` — sends day-before reminder

*UI needed:*
- `/{slug}/book` — booking form (service picker, date/time preference, name, phone)
- Owner dashboard: appointment list with confirm/cancel actions
- Confirmed email/SMS to customer

**Phase B: Calendar Availability (build later)**
Owner sets available hours per day of week. Customers see real open slots. This is a separate sprint — don't block Phase A on it.

---

### 🟡 9. Photo / File Upload — PARTIAL

**What exists:** Product images are URLs (externally hosted). No file upload capability.

**To build:** Wire up Supabase Storage.

```
Buckets needed:
- client-assets/      (logos, hero photos — Shawcliffe uploads)
- job-photos/         (before/after — business owner and customers upload)
- product-images/     (business owner uploads)
```

RLS on Storage: each bucket path prefixed by `client_id/` so tenants can't access each other's files.

*Routes needed:*
- `POST /api/upload` — signed upload URL generation (don't pipe files through Next.js)

This is straightforward Supabase Storage work. Unlocks: trades quote photos, before/after galleries, pet grooming photos.

---

### ❌ 10. Payments — DEFERRED (correct call)

The `payment_intents` stub table is the right move. Don't touch this until you have 5+ clients asking for it. Stripe Connect (for taking payments on behalf of clients) is complex. Defer to Phase 4 as planned.

---

## Open Decisions (Need Resolution Before Building)

### Decision 1: Business Owner Auth
How does the business owner log into their dashboard?

| Option | Pros | Cons |
|---|---|---|
| Magic link to `operator_email` | No password to manage, simple | Requires email access |
| Simple password on `clients` table | Fast to build | Not great security practice |
| Supabase Auth user linked to client | Proper, scalable | More setup |

**Recommendation:** Supabase Auth user with `user_id` column on `clients`. One-time setup per client. Use this to gate `/dashboard` routes.

### Decision 2: Native App Framework — DECIDED
**Swift (iOS) + Kotlin (Android).** Three separate codebases sharing the same Supabase backend.

| Surface | Language | Supabase SDK |
|---|---|---|
| Web | TypeScript / Next.js | `@supabase/supabase-js` |
| iOS | Swift | `supabase-swift` (official) |
| Android | Kotlin | `supabase-kt` (official) |

**Push notification implications:**
- iOS: register with APNs → get APNs device token → save to `customers.apns_token`
- Android: register with FCM → get FCM registration token → save to `customers.fcm_token`
- Server-side: you now manage two push providers. **Strongly recommend routing both through FCM** — the Firebase Admin SDK for Swift lets iOS apps register via FCM too, so your server only calls one API. If you want direct APNs (no Firebase dependency on iOS), the server needs the `apns-http2` path separately.

**White-labeling implications:**
Each client has their own `apple_bundle_id` and `android_package`. In practice this means:
- **iOS:** One Xcode project with multiple targets (one per client), each with its own bundle ID, signing certificate, and App Store Connect entry. Alternatively, a single app with tenant config loaded at runtime (simpler operationally).
- **Android:** One project with multiple product flavors, or separate `applicationId` per client build variant.

The "separate target/flavor per client" model is correct for true white-labeling but creates operational overhead — every new client requires a new App Store / Play Store submission. Worth defining early whether clients get truly separate apps or whether it's one platform app with per-tenant branding loaded at launch.

### Decision 3: Vertical Expansion
The `clients.vertical` column currently only allows: `produce_seller`, `baker`, `cleaner`, `welder`. Every new archetype requires a migration to add values.

**Recommendation:** Change `vertical` from a CHECK constraint to a free-text field with a validated enum in application code. Lets you onboard new verticals without a migration each time.

```sql
alter table clients drop constraint clients_vertical_check;
-- Validate in app code against a maintained list
```

---

## Recommended Build Sequence (Based on Codebase Reality)

| Sprint | Component | Effort | Unlocks |
|---|---|---|---|
| 1 | Inquiry / contact form | Small | Lead machine for all archetypes |
| 1 | Review request system | Small | High-value, easy sell |
| 1 | `vertical` constraint fix | Tiny | Onboard any business type |
| 2 | Business owner auth + dashboard | Medium | Clients can self-manage |
| 2 | Customer list + notes/tags | Small | CRM value |
| 3 | Booking request (Phase A) | Medium | Appointment-based templates |
| 3 | Supabase Storage + photo upload | Medium | Trades, beauty, creative templates |
| 4 | Broadcast UI for business owner | Small | Owner-driven notifications |
| 4 | Web push notifications | Medium | Replaces APNs/FCM columns |
| 5 | Booking availability (Phase B) | Large | Full scheduling |
| 6 | Stripe payments | Large | Deposits, orders, packages |

**Templates unlockable after Sprint 3:**
- Appointment template (massage, hair, nails, tutoring, coaching, pet grooming)
- Quote/job request template (plumber, welder, HVAC, handyman)
- Order/pre-order template (bakery, food, market) — already partially working
- Creative/event inquiry template (photographer, florist, DJ)
- Professional service intake template (bookkeeper, consultant)
