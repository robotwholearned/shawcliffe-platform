-- Property Profiles (Tier 1, component key `property_profiles`). Growth-
-- tier scope per the Ops Guide (section 3.22): basic property profiles,
-- no service history/recurring-schedule linkage/staff permissions
-- (that's Premium). Address is the key record per the build note ("use
-- property address as key record"). Sensitive fields (gate code, access
-- notes) get no special encryption/masking beyond the existing RLS —
-- Growth tier explicitly defers "access/security concerns" as a Premium
-- price driver, same posture as pets' allergy/vaccination notes.
--
-- Connected to the Inquiry / Quote Form per the build note ("connect to
-- Photo Upload for before/after or access photos" — that's already on
-- this form) — a property is created alongside an inquiry, not through a
-- standalone customer screen, same reasoning as vehicles/pets.
create table properties (
  client_id              uuid        not null references clients(id) on delete cascade,
  id                     uuid        not null default gen_random_uuid(),
  customer_id            uuid        not null,
  address                text,
  gate_code              text,
  parking_instructions   text,
  pets_on_site           text,
  access_notes           text,
  preferred_service_day  text,
  lawn_size              text,
  snow_removal_areas     text,
  cleaning_instructions  text,
  safety_notes           text,
  created_at             timestamptz not null default now(),
  primary key (client_id, id),
  -- Composite FK: cross-tenant customer reference is structurally impossible
  foreign key (client_id, customer_id) references customers(client_id, id)
);

alter table properties enable row level security;

create policy "service_or_staff_all" on properties
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

create index idx_properties_client_customer on properties(client_id, customer_id);

alter table inquiries add column property_id uuid;
alter table inquiries
  add constraint inquiries_property_fkey
  foreign key (client_id, property_id) references properties(client_id, id) on delete set null;
