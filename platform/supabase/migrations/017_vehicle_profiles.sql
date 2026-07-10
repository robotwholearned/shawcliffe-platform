-- Vehicle Profiles (Tier 1, component key `vehicle_profiles`). Growth-tier
-- scope per the Ops Guide (section 3.24): basic vehicle profiles, no
-- fleet accounts/service-history workflow/maintenance reminders (that's
-- Premium). VIN/plate are optional per the build note ("avoid collecting
-- VIN unless client truly needs it").
--
-- Connected to the Inquiry / Quote Form per the same build note — a vehicle
-- is created alongside an inquiry, not through a standalone customer
-- screen (this app has no customer login/session to list "my vehicles"
-- across visits).
create table vehicles (
  client_id    uuid        not null references clients(id) on delete cascade,
  id           uuid        not null default gen_random_uuid(),
  customer_id  uuid        not null,
  make         text,
  model        text,
  year         int,
  vin          text,
  plate        text,
  mileage      int,
  notes        text,
  created_at   timestamptz not null default now(),
  primary key (client_id, id),
  -- Composite FK: cross-tenant customer reference is structurally impossible
  foreign key (client_id, customer_id) references customers(client_id, id)
);

alter table vehicles enable row level security;

create policy "service_or_staff_all" on vehicles
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

create index idx_vehicles_client_customer on vehicles(client_id, customer_id);

alter table inquiries add column vehicle_id uuid;
alter table inquiries
  add constraint inquiries_vehicle_fkey
  foreign key (client_id, vehicle_id) references vehicles(client_id, id) on delete set null;
