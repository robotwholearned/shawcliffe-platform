-- Inquiry / Quote Form (Tier 1, component key `inquiry_quote_form`).
-- Structured lead capture for service-quote businesses (trades, events,
-- coaching, professional services) — replaces "how much?" texts. Staff
-- respond/quote externally; no in-app quoting, dispatch, or payment flow
-- (see agency/Shawcliffe Digital Operations Guide.html, section 11.18).
create table inquiries (
  client_id                uuid        not null references clients(id) on delete cascade,
  id                       uuid        not null default gen_random_uuid(),
  customer_id              uuid        not null,
  service_category         text,
  job_location             text,
  urgency                  text        check (urgency in ('asap', 'this_week', 'this_month', 'flexible')),
  description              text,
  photo_urls               text[]      not null default '{}',
  preferred_contact_method text        check (preferred_contact_method in ('phone', 'email', 'sms')),
  status                   text        not null default 'new'
                                       check (status in ('new', 'contacted', 'quoted', 'won', 'lost')),
  created_at               timestamptz not null default now(),
  primary key (client_id, id),
  -- Composite FK: cross-tenant customer reference is structurally impossible
  foreign key (client_id, customer_id) references customers(client_id, id)
);

alter table inquiries enable row level security;

-- Submission goes through a Next.js API route using service_role — no direct anon insert.
create policy "service_or_staff_all" on inquiries
  for all using (
    auth.role() = 'service_role'
    or (
      auth.role() = 'authenticated'
      and client_id = (auth.jwt() -> 'app_metadata' ->> 'client_id')::uuid
      and (auth.jwt() -> 'app_metadata' ->> 'role') = 'client_staff'
    )
  )
  with check (
    auth.role() = 'service_role'
    or (
      auth.role() = 'authenticated'
      and client_id = (auth.jwt() -> 'app_metadata' ->> 'client_id')::uuid
      and (auth.jwt() -> 'app_metadata' ->> 'role') = 'client_staff'
    )
  );
