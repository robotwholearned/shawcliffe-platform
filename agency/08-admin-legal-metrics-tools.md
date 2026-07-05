# 8. Internal Admin, Legal/Risk, Metrics, Tool Stack

## Internal Admin Documentation

A single shared spreadsheet (or lightweight tool, see [tool stack](#tool-stack-suggestions)) covering:

- **Leads** — name, source, status, next follow-up date
- **Proposals** — client, sent date, amount, status (pending/accepted/declined)
- **Active projects** — client, stage (per [06](06-project-delivery.md)), target launch date, blockers
- **Invoices** — client, amount, due date, paid Y/N
- **Subscriptions** — client, plan tier, renewal date, monthly amount
- **Client logins** — stored in a password manager (shared vault), never in a plain spreadsheet
- **Support requests** — client, request, status, resolved date
- **Renewal dates** — domain, hosting, annual support plans — anything that lapses if ignored

### Storing Files

One shared cloud drive folder per client: `Clients/[Client Name]/`. Subfolders: `Contracts`,
`Assets` (logos/photos), `Content`, `Design`, `Exports/Backups`.

### Naming Conventions

`ClientName_DocType_YYYYMMDD` for anything versioned (e.g. `AcmeBakery_Proposal_20260305`). Avoids
"final_v2_ACTUALFINAL.docx" chaos.

### Folder Structure

```
Clients/
  [Client Name]/
    Contracts/
    Assets/
    Content/
    Design/
    Exports-Backups/
```

### Password/Security Rules

- All client credentials in a shared password manager, never in email/Slack/plain docs.
- Unique passwords per client system — no reused passwords across clients.
- Revoke access immediately on contract end.
- 2FA on everything that supports it (your own accounts, hosting, domain registrar).

## Legal and Risk Management Documents

**These are plain-English business drafts, not legal advice. Have an actual lawyer review every one
before you rely on it in a real contract.**

- **Service agreement** — the master terms: scope, payment, IP, liability limits, termination
- **Statement of Work (SOW)** — per-project specifics: deliverables, price, timeline, references the
  master agreement
- **Change request policy** — anything outside the signed SOW is quoted and approved in writing
  before work starts
- **Payment terms** — deposit required to start, balance due on launch (or milestone schedule for
  larger builds); late payments pause work
- **Refund policy** — deposits are generally non-refundable once work has started; define what
  happens if a client cancels mid-project
- **Late payment process** — grace period, then a written notice, then pause/stop work until paid
- **Client approval policy** — written sign-off required before launch; verbal approval alone doesn't
  count
- **Ownership of work** — client owns final deliverables (site, content) upon full payment; we retain
  rights to reusable templates/components we built the delivery on
- **Hosting responsibility** — define clearly whether we host it or the client does, and what happens
  if they cancel support but keep the site
- **Third-party tools** — client is responsible for their own third-party subscription costs (SMS
  carrier, payment processor, etc.); we're not liable for that vendor's outages/policies
- **Privacy policy considerations** — any site collecting customer data (forms, bookings) needs a
  basic privacy policy; flag this to the client rather than silently building it in
- **Data/security expectations** — define what data we store, how, and for how long; define what
  happens to client data if the relationship ends

## Internal Metrics

Track monthly, keep it to a single sheet:

| Metric | Why it matters |
|---|---|
| Leads contacted | Top of funnel volume |
| Conversations started | Real engagement, not just a form fill |
| Discovery calls booked | Qualification working |
| Proposals sent | Sales activity |
| Proposals accepted | Close rate |
| Average project value | Are you pricing right |
| Monthly recurring revenue (MRR) | The actual health of the business |
| Time to launch | Delivery efficiency |
| Client satisfaction | Ask directly at launch + quarterly |
| Support requests | Volume — too high signals a product/training problem |
| Referral sources | Where your best leads actually come from |
| Most profitable service types | Where to focus sales effort |

## Tool Stack Suggestions

Prioritize free/cheap tools that do one job well — don't buy an all-in-one platform before you have
the volume to justify it.

| Need | Suggested tool |
|---|---|
| CRM | A shared spreadsheet at first; Notion or a free-tier CRM (e.g. HubSpot free) once leads exceed ~20/month |
| Project management | Trello or Notion — simple kanban per project stage |
| Documentation | This folder (markdown in the repo) or Notion |
| File storage | Google Drive or Dropbox |
| Password management | Bitwarden (shared team vault) |
| Invoicing | Wave (free) or Stripe Invoicing |
| Contracts/e-signatures | HelloSign/Dropbox Sign, or PandaDoc once volume justifies the cost |
| Scheduling | Calendly (free tier) |
| Forms | Whatever's native to the site build; Tally or Google Forms for quick standalone needs |
| Email marketing | Mailchimp free tier, or Buttondown for something simpler |
| SMS | Twilio (already in use per the platform's toll-free verification setup) |
| Analytics | Google Analytics / Search Console (free) |
| Website/app hosting | Vercel/Render for the web stack already in use; Supabase for backend/data |
| Client support | A shared inbox (e.g. a Google Group or Help Scout free tier) beats a personal phone number long-term |

**Must-have now:** spreadsheet CRM, Google Drive, Bitwarden, Wave, Calendly, GA.
**Nice-to-have later:** dedicated CRM, PandaDoc, Help Scout — once volume actually demands it.
