# 6. Project Delivery: Management, Onboarding, Build, QA, Launch

## Project Management Process

| Stage | Owner | Blocks if... |
|---|---|---|
| Intake | PM | Contract/deposit not received |
| Scope confirmation | PM | Client hasn't confirmed the proposal scope in writing |
| Asset collection | PM | Client hasn't sent logo/photos/copy |
| Content collection | PM | Same as above — biggest real-world bottleneck |
| Technical setup | Dev | Domain/hosting access not provided |
| Design | Design | Brand info form incomplete |
| Development | Dev | Waiting on content or a client decision |
| Internal review | QA | Build not feature-complete |
| Client review | PM | Client unresponsive |
| Revisions | Dev | Feedback vague/contradictory |
| Testing | QA | Above unresolved |
| Launch | PM/Dev | DNS/hosting not confirmed |
| Post-launch check-in | Support | N/A — always happens |

### Preventing Scope Creep

- Everything not explicitly listed in "included" is out, per the proposal (see [05](05-proposals-and-pricing.md)).
- New requests get a one-line answer: "Happy to add that — here's what it adds to timeline/price."
  Never just silently absorb it.
- Keep a running "parking lot" list of client asks that are out of scope — revisit at launch as
  upsell candidates, don't argue about them mid-build.

### Communicating Delays

Tell the client before they ask. A one-line proactive update ("we're a few days behind because
we're still waiting on your product photos — no rush, just flagging it") builds trust; silence
destroys it. If the delay is on us, say so plainly and give a new date.

### Keeping Clients From Disappearing

- Set a "content deadline" in the kickoff call, not just a vague "whenever you get to it."
- If a client goes quiet, follow the same cadence as sales follow-up (day 3, 7, 14) — see
  [09-templates-and-scripts.md](09-templates-and-scripts.md).
- After 30 days of silence mid-project, send a clear "pausing the project until we hear back" email
  so it doesn't sit as an open commitment on your side forever.

## Client Onboarding Documentation

### Onboarding Checklist

- [ ] Contract signed
- [ ] Deposit received
- [ ] Welcome email sent
- [ ] Kickoff call scheduled
- [ ] Brand info form sent
- [ ] Content request sent
- [ ] Access/login request sent (domain registrar, GBP, existing hosting, socials)
- [ ] Kickoff call held, agenda covered
- [ ] Timeline shared with client

### Client Homework Checklist (what we need from them)

- [ ] Logo (or agreement we design one)
- [ ] Photos (products, storefront, team — phone photos are fine)
- [ ] Business hours, contact info, service list + prices
- [ ] Short "about us" blurb (or answers to questions if they don't want to write one)
- [ ] Any existing accounts (domain, GBP, socials) — logins or invite access
- [ ] Preferred colors/style examples if they have opinions

### Asset Collection List

Logo files, product/service photos, existing brand colors, any existing copy/text they like, social
media handles, any legal/business info needed for footer (business name, address if public).

### Login / Access Request List

Domain registrar login (or ownership transfer/DNS access), current hosting if migrating, Google
Business Profile access, social accounts if we're posting, any existing tool we need to integrate
(payment processor, calendar, etc.).

### Brand Information Form

Business name, tagline (if any), colors (hex if known, or "like this competitor's site"), fonts/style
preference, logo files, tone (professional / friendly / rustic / modern), anything they explicitly
hate.

### Project Kickoff Agenda (30 min call)

1. Recap what we're building and why (2 min)
2. Confirm timeline and milestones (5 min)
3. Walk through their homework checklist — what's ready, what's pending (10 min)
4. Set the content deadline (5 min)
5. Confirm how they want to communicate (email, text, call) and how often (5 min)
6. Answer questions (3 min)

### Expectations Document (one-pager, send after kickoff)

- What we need from you and by when
- What "in scope" means for this project (link/attach the proposal)
- Response time you can expect from us
- How revisions work (how many rounds included, what counts as a revision vs. new scope)
- What happens after launch (support plan starts, see [07](07-client-training-and-support.md))

## Development & Build SOPs

Each SOP: goal → inputs needed → build steps → testing steps → launch steps → common mistakes →
definition of done.

### Website Project

- **Goal:** professional, mobile-first site that builds trust and gets them found.
- **Inputs:** brand form, content, photos, domain access.
- **Build steps:** structure pages → apply brand → drop in content → add contact info/forms → hook
  up analytics.
- **Testing:** mobile responsiveness, forms fire correctly, links work, spelling pass.
- **Launch:** DNS cutover, SSL, submit to Google Search Console.
- **Common mistakes:** launching before content is finalized "temporarily" (it never gets finished);
  forgetting mobile testing on an actual phone, not just a resized browser.
- **Definition of done:** live on client's domain, passes QA checklist ([below](#quality-assurance-and-testing)), client has signed off.

### Landing Page Project

- **Goal:** single focused page for one campaign/offer.
- **Inputs:** the offer, one clear CTA, minimal content.
- **Build steps:** hero + offer → single CTA → proof/trust element → form.
- **Testing:** form submits, CTA tracked, loads fast on mobile.
- **Launch:** connect domain/subdomain, confirm tracking pixel/analytics if used.
- **Common mistakes:** adding multiple competing CTAs — one page, one action.
- **Definition of done:** live, tracked, form tested end-to-end (submission actually arrives).

### Lead Capture System

- **Goal:** no inquiry falls through the cracks.
- **Inputs:** where leads should go (email/SMS/dashboard), who owns follow-up.
- **Build steps:** form/entry point → validation → routing (email/SMS/CRM) → confirmation message
  to the customer.
- **Testing:** submit test leads from a real phone, confirm delivery to every configured channel,
  check spam folder.
- **Launch:** confirm client knows where leads land and how fast to respond.
- **Common mistakes:** leads going to an inbox nobody checks; no confirmation shown to the customer
  so they submit twice.
- **Definition of done:** test lead received end-to-end, client knows how to check it daily.

### Booking / Inquiry System

- **Goal:** reduce phone tag, let clients self-serve scheduling.
- **Inputs:** service list, durations, availability rules, buffer times.
- **Build steps:** service/availability config → booking flow → confirmation (email/SMS) → reminder
  automation if included.
- **Testing:** book as a test customer end-to-end, test a cancellation/reschedule, test a double-
  booking edge case.
- **Launch:** confirm timezone is correct (this breaks constantly), confirm reminders actually send.
- **Common mistakes:** wrong timezone; no buffer between appointments; owner not shown how to block
  off personal time.
- **Definition of done:** owner has successfully blocked a day off and booked/cancelled a test slot
  themselves.

### Roadside Seller Inventory/Status App

*(This is our own Seller/Customer app pattern — dashboard + broadcast + customer-facing status.)*

- **Goal:** seller updates open/closed + inventory from their phone; customers see it live and get
  notified.
- **Inputs:** product list, seller's phone for the seller app, customer notification preference
  (SMS/push).
- **Build steps:** seller dashboard (status, inventory, broadcast) → customer-facing view → 
  notification pipeline (see toll-free/SMS verification requirements) → seasonal pause handling if
  the business is seasonal.
- **Testing:** toggle open/closed and confirm customer view updates in real time; send a test
  broadcast and confirm delivery; test seasonal pause state doesn't break the customer view.
- **Launch:** confirm seller is comfortable updating status from their phone unsupervised before
  walking away.
- **Common mistakes:** assuming the seller will remember to update status — walk them through it
  live at least twice; not testing notification delivery on both iOS and Android.
- **Definition of done:** seller has independently toggled status and sent a broadcast without help.

### Owner Dashboard / Admin Portal

- **Goal:** owner self-serves updates without calling us.
- **Inputs:** what fields they need to control (hours, prices, status, content).
- **Build steps:** auth/login → editable fields scoped to what they actually need → save/confirm
  feedback → mobile-usable layout.
- **Testing:** log in as the client role (not admin), attempt every edit, confirm changes reflect on
  the live customer-facing side.
- **Launch:** create their login, send credentials securely (not plain email — use a password
  manager share or similar).
- **Common mistakes:** giving them more controls than they need (confusing); no confirmation feedback
  after saving, so they re-submit repeatedly.
- **Definition of done:** client has logged in and made one real edit unsupervised.

### SMS / Email Notification System

- **Goal:** customers get timely updates without the owner manually texting people.
- **Inputs:** notification triggers (open/closed, back in stock, appointment reminder), opt-in list.
- **Build steps:** trigger config → message templates → delivery pipeline → opt-out handling
  (required, not optional).
- **Testing:** send test notification to a real device on each channel, confirm opt-out link/reply
  works.
- **Launch:** confirm toll-free/sender verification is complete before relying on SMS at volume —
  carriers will throttle or block unverified senders.
- **Common mistakes:** no opt-out mechanism (compliance risk); assuming SMS sends instantly without
  checking carrier filtering/verification status.
- **Definition of done:** test message delivered and opt-out tested end-to-end.

### QR Code Campaign

- **Goal:** bridge physical marketing (cards, signage) to a digital destination.
- **Inputs:** destination URL, physical medium (card/sign/sticker).
- **Build steps:** generate QR → point to destination → design physical asset.
- **Testing:** scan with multiple phones/camera apps, confirm destination loads correctly on mobile.
- **Launch:** print/order physical materials, confirm destination is live before materials go out.
- **Common mistakes:** printing before testing the link; linking to a page not optimized for mobile.
- **Definition of done:** scanned and verified on at least two different phones.

### Google Business Profile Support

- **Goal:** client is findable and looks legitimate in local search/maps.
- **Inputs:** business info, photos, category, hours.
- **Build steps:** claim/verify listing → complete profile fields → add photos → set categories/hours
  correctly.
- **Testing:** search the business name, confirm listing appears with correct info.
- **Launch:** confirm client (or us, with access) can post updates/respond to reviews going forward.
- **Common mistakes:** wrong category (huge impact on discoverability); leaving hours unset or wrong.
- **Definition of done:** listing verified, complete, and shows correctly in a live search.

## Quality Assurance and Testing

Run this checklist before every client review, and again before launch:

- [ ] **Mobile responsiveness** — real phone, not just resized browser, both iOS and Android if
      relevant
- [ ] **Forms** — every form submits and confirms
- [ ] **Lead capture** — test lead arrives at the correct destination
- [ ] **Email notifications** — test email arrives, not in spam
- [ ] **SMS notifications** — test text arrives, opt-out works
- [ ] **Admin dashboard** — every control does what it says, changes reflect live
- [ ] **Payment links** (if applicable) — test transaction in sandbox/test mode
- [ ] **SEO basics** — page titles, meta descriptions, one H1 per page
- [ ] **Accessibility basics** — alt text on images, sufficient color contrast, keyboard-navigable
      forms
- [ ] **Page speed basics** — images compressed, no giant unoptimized files
- [ ] **Security basics** — SSL active, no exposed API keys/secrets in client-facing code
- [ ] **Broken links** — click every link on every page
- [ ] **Spelling/grammar** — full read-through, ideally by the person who didn't write it
- [ ] **Client approval** — explicit sign-off in writing (email is fine) before launch

## Launch Process

- [ ] Domain setup confirmed/transferred
- [ ] Hosting/deployment live
- [ ] SSL active
- [ ] Analytics installed and confirmed tracking
- [ ] Forms tested in production (not just staging)
- [ ] Notifications tested in production
- [ ] Backup taken/confirmed before go-live
- [ ] Client training completed ([07](07-client-training-and-support.md))
- [ ] Client approval documented
- [ ] Google Business Profile updated to match new site
- [ ] QR codes tested against the live (not staging) destination
- [ ] Post-launch monitoring set for the first 48 hours (check for errors, form failures)
- [ ] Launch announcement sent (client's socials, GBP post, or our own case-study post — client's
      choice)
