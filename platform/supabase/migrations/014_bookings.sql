-- Booking Request System (Tier 1, component key `booking_request_system`).
-- Request-only booking: customer proposes a service/date/time, owner confirms
-- manually — no live calendar/availability engine (see agency/Shawcliffe
-- Digital Operations Guide.html, section 3.12, "Internal Build Notes": prefer
-- booking request over complex real-time calendar booking unless needed).
create table bookings (
  client_id      uuid        not null references clients(id) on delete cascade,
  id             uuid        not null default gen_random_uuid(),
  customer_id    uuid        not null,
  service        text,
  requested_date date,
  requested_time text,
  notes          text,
  status         text        not null default 'requested'
                             check (status in ('requested', 'confirmed', 'declined', 'completed', 'cancelled')),
  created_at     timestamptz not null default now(),
  primary key (client_id, id),
  -- Composite FK: cross-tenant customer reference is structurally impossible
  foreign key (client_id, customer_id) references customers(client_id, id)
);

alter table bookings enable row level security;

-- Submission goes through a Next.js API route using service_role — no direct anon insert.
create policy "service_or_staff_all" on bookings
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

-- Support the seller bookings list query (client_id [+ status] filter,
-- ordered by created_at desc) — same indexing convention as inquiries.
create index idx_bookings_client_created on bookings(client_id, created_at desc);
create index idx_bookings_client_status on bookings(client_id, status);
