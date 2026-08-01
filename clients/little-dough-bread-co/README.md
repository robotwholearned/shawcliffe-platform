# Little Dough Bread Co.

Status: **prospect, not yet contacted.** Everything below is a dry-run built against the real production platform, on a non-discoverable slug, so nothing here is visible to Shayne or the public yet.

Pitch prep (discovery notes, qualification, outreach message) lives in [`agency/prospects/little-dough-bread-co.md`](../../agency/prospects/little-dough-bread-co.md). This folder is the technical/provisioning side.

## Platform record

| | |
|---|---|
| Client ID | `6a63b4cc-8f93-4a2c-a725-03b43ccf92f5` |
| Slug | `dryrun-b7x2k9` (non-discoverable — not her real name) |
| Storefront | `dryrun-b7x2k9.shawcliffedigital.com` |
| Vertical / Tier | Food Producers & Specialty Makers, Tier 1 |
| Components | Business Profile, Product Menu, Inquiry Form, Notifications, Review Requests, Product Inventory, Admin Dashboard, Resource Library/FAQ |
| Products seeded | 14, prices confirmed via her own posted Instagram Menu highlight where noted; 2 (Bagels, Macarons) are estimates |
| Branding | Green `#3f6b3a`, rustic theme, logo + 4 hero photos uploaded (logo is a full Instagram graphic, not an isolated logo file — real one still needed from her) |

## Seller dashboard login

- URL: `/seller/login`
- Email: `shayne@gmail.com` (placeholder — never actually confirmed as her real email)
- Password: set at provisioning time via the admin "Create Seller Login" flow; not stored here. Rotate/reset it in Supabase Auth if the dry-run login is needed again.

## Deal terms (proposed, not yet sent)

- $1,000 base (Menu & Preorder Starter, scoped down) + $250 admin/seller dashboard add-on = **$1,250**
- Payment: $625 deposit / $625 before launch (Medium Project terms, since the dashboard add-on pushed it past Small Project/full-upfront)
- Monthly support: Basic Maintenance, $100/mo (optional)

## Demo app sources

Buildable Xcode project sources, not compiled binaries. Local-simulator only — not installable/shareable, no App Store involvement.

- `ios-seller/` — straight copy of `platform/ios-seller`. Generic seller app, works with any client login (same one used for Tom's Produce), no per-client changes.
- `ios-customer/` — a full copy of `platform/ios-customer`, including a fix (also applied upstream) that threads `primaryColor`/`fontTheme` into every sub-screen (Preorder, Booking, Quote, Signup, Documents) — previously only the storefront page itself used branding, so tapping into any actual flow dropped back to plain default styling. `Info.plist` is directly edited to Little Dough's `CLIENT_ID`/`CLIENT_SLUG`/display name (the project no longer uses `project.yml`/xcodegen — that got removed upstream in favor of a static, committed `Info.plist` with per-client values hardcoded); `CLIENT_BUNDLE_ID` is also set directly in `project.pbxproj` (`ca.shawcliffe.customer.dryrunb7x2k9`) so it's fully self-contained without needing build-time overrides.
- Android: not built — no `adb`/emulator available in this environment

To run: open the `.xcodeproj` in Xcode (or `xcodebuild ... -destination "id=<simulator-id>" build`), install to a simulator, launch. No env vars or generation step needed — it's a self-contained checkout.

## Open items before this could go real

- Confirm her actual menu/prices, allergy/ordering policy wording, and a real email address
- Check whether a Google Business Profile already exists
- Get an actual isolated logo file (everything available is a full graphic with the mark stamped on)
- Domain transfer for littledoughbreadco.com — deferred, she doesn't know how yet
