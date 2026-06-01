-- Shawcliffe Platform — 4-Surface RLS Policies
--
-- Surface 1: Postgres Table RLS (this file)
-- Surface 2: Storage bucket policies (apply in Supabase dashboard — see comments below)
-- Surface 3: Realtime channel auth (003_realtime.sql)
-- Surface 4: Edge Function service-role discipline (enforced in code review)
--
-- Three roles:
--   anon            — unauthenticated customer (public reads only)
--   authenticated   — seller with client_staff claim (own client RW)
--   service_role    — Shawcliffe admin / Edge Functions (unrestricted)
--
-- JWT claims read from app_metadata:
--   app_metadata.client_id  — uuid of the seller's client
--   app_metadata.role       — 'client_staff' | 'shawcliffe_admin'

-- ─── Enable RLS on all tables ─────────────────────────────────────────────────

alter table clients          enable row level security;
alter table client_branding  enable row level security;
alter table locations        enable row level security;
alter table products         enable row level security;
alter table daily_status     enable row level security;
alter table customers        enable row level security;
alter table preorders        enable row level security;
alter table preorder_items   enable row level security;
alter table announcements    enable row level security;
alter table payment_intents  enable row level security;
alter table notification_log enable row level security;

-- ─── clients — service role only ──────────────────────────────────────────────

create policy "service_role_only" on clients
  using (auth.role() = 'service_role');

-- ─── client_branding — public read, staff + service write ────────────────────

create policy "public_read" on client_branding
  for select using (true);

create policy "staff_or_service_write" on client_branding
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

-- ─── locations — public read, staff + service write ──────────────────────────

create policy "public_read" on locations
  for select using (true);

create policy "staff_or_service_write" on locations
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

-- ─── products — public read, staff + service write ───────────────────────────

create policy "public_read" on products
  for select using (true);

create policy "staff_or_service_write" on products
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

-- ─── daily_status — public read, staff + service write ───────────────────────

create policy "public_read" on daily_status
  for select using (true);

create policy "staff_or_service_write" on daily_status
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

-- ─── customers — service_role + staff only ────────────────────────────────────
-- Signup goes through a Next.js API route using service_role — no direct anon insert.

create policy "service_or_staff_all" on customers
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

-- ─── preorders ────────────────────────────────────────────────────────────────

create policy "service_or_staff_all" on preorders
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

-- ─── preorder_items ───────────────────────────────────────────────────────────

create policy "service_or_staff_all" on preorder_items
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

-- ─── announcements ────────────────────────────────────────────────────────────

create policy "service_or_staff_all" on announcements
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

-- ─── payment_intents ──────────────────────────────────────────────────────────

create policy "service_or_staff_all" on payment_intents
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

-- ─── notification_log ─────────────────────────────────────────────────────────

create policy "staff_read" on notification_log
  for select using (
    auth.role() = 'service_role'
    or (
      auth.role() = 'authenticated'
      and client_id = (auth.jwt() -> 'app_metadata' ->> 'client_id')::uuid
      and (auth.jwt() -> 'app_metadata' ->> 'role') = 'client_staff'
    )
  );

create policy "service_write" on notification_log
  for insert with check (auth.role() = 'service_role');

-- ─── Surface 2: Storage bucket policies ───────────────────────────────────────
-- Apply in the Supabase dashboard: Storage > New bucket "assets" (public) > Policies
--
-- SELECT (public read — logos, product images):
--   true
--
-- INSERT / UPDATE / DELETE (staff or service_role only):
--   auth.role() = 'service_role'
--   OR (
--     auth.role() = 'authenticated'
--     AND storage.foldername(name)[1]::uuid = (auth.jwt()->'app_metadata'->>'client_id')::uuid
--     AND (auth.jwt()->'app_metadata'->>'role') = 'client_staff'
--   )
