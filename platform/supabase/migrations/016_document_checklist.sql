-- Document Checklist / File Portal (Tier 1, component key
-- `document_checklist_intake`). Growth-tier scope per the Ops Guide
-- (section 3.21): checklist + upload, no secure portal/status
-- tracking/e-signature (that's Premium).
--
-- Checklist items are seller-defined static content — same "public read,
-- staff/service write" shape as products. `needs_upload` separates "bring
-- with you" reminders (no upload expected) from items customers actually
-- submit a file for, per the Ops Guide's internal build note.
create table document_checklist_items (
  client_id    uuid        not null references clients(id) on delete cascade,
  id           uuid        not null default gen_random_uuid(),
  title        text        not null,
  description  text,
  required     boolean     not null default true,
  needs_upload boolean     not null default true,
  sort_order   int         not null default 0,
  created_at   timestamptz not null default now(),
  primary key (client_id, id)
);

alter table document_checklist_items enable row level security;

create policy "public_read" on document_checklist_items
  for select using (true);

create policy "staff_or_service_write" on document_checklist_items
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

-- Customer-submitted files against a checklist item. Same
-- customer-creation + service_role trust model as inquiries/bookings —
-- submission goes through a Next.js API route, no direct anon insert.
create table document_submissions (
  client_id         uuid        not null references clients(id) on delete cascade,
  id                uuid        not null default gen_random_uuid(),
  customer_id       uuid        not null,
  checklist_item_id uuid,
  file_url          text        not null,
  submitted_at      timestamptz not null default now(),
  primary key (client_id, id),
  -- Composite FKs: cross-tenant references are structurally impossible
  foreign key (client_id, customer_id) references customers(client_id, id),
  foreign key (client_id, checklist_item_id) references document_checklist_items(client_id, id) on delete set null
);

alter table document_submissions enable row level security;

create policy "service_or_staff_all" on document_submissions
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

create index idx_document_submissions_client_customer on document_submissions(client_id, customer_id);
create index idx_document_submissions_client_item on document_submissions(client_id, checklist_item_id);
