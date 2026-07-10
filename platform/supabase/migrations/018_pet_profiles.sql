-- Pet Profiles (Tier 1, component key `pet_profiles`). Growth-tier scope
-- per the Ops Guide (section 3.23): basic pet profiles, no service
-- history/reminders/customer portal (that's Premium). Free-text fields
-- throughout per the build note ("avoid veterinary/medical overreach" —
-- allergies/vaccination info are owner-reported notes, not a medical
-- record).
--
-- Connected to the Booking Request System per the same build note — a pet
-- is created alongside a booking, not through a standalone customer
-- screen (this app has no customer login/session to list "my pets"
-- across visits, same reasoning as vehicles/inquiries in
-- 017_vehicle_profiles.sql).
create table pets (
  client_id             uuid        not null references clients(id) on delete cascade,
  id                    uuid        not null default gen_random_uuid(),
  customer_id           uuid        not null,
  name                  text,
  breed                 text,
  size                  text,
  age                   text,
  allergies             text,
  behavior_notes        text,
  grooming_preferences  text,
  vaccination_info      text,
  emergency_contact     text,
  care_instructions     text,
  created_at            timestamptz not null default now(),
  primary key (client_id, id),
  -- Composite FK: cross-tenant customer reference is structurally impossible
  foreign key (client_id, customer_id) references customers(client_id, id)
);

alter table pets enable row level security;

create policy "service_or_staff_all" on pets
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

create index idx_pets_client_customer on pets(client_id, customer_id);

alter table bookings add column pet_id uuid;
alter table bookings
  add constraint bookings_pet_fkey
  foreign key (client_id, pet_id) references pets(client_id, id) on delete set null;
