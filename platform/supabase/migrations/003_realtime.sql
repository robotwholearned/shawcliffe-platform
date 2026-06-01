-- Shawcliffe Platform — Realtime (Surface 3)
--
-- Channel naming convention: tenant:{client_id}:{resource}
--   tenant:{client_id}:status    → daily_status changes
--   tenant:{client_id}:products  → products changes
--   tenant:{client_id}:preorders → preorders changes (staff only)
--
-- Public tables (status, products) are added to the realtime publication.
-- The server-side filter on postgres_changes uses client_id=eq.{client_id}
-- so clients only receive updates for the client they subscribed to.

alter publication supabase_realtime add table daily_status;
alter publication supabase_realtime add table products;
alter publication supabase_realtime add table preorders;

-- Realtime Authorization via realtime.messages RLS:
-- Staff can subscribe to their own client's channels.
-- Public (anon) can subscribe to status + products channels only.
-- Preorders channel requires client_staff JWT.
--
-- Apply in Supabase dashboard under Realtime > Policies, or via SQL:

alter table realtime.messages enable row level security;

-- Allow anon to receive status and products broadcasts for any client
-- (these are public storefronts — same as the public_read table policies)
create policy "anon_public_channels" on realtime.messages
  for select using (
    realtime.topic() like 'tenant:%:status' or
    realtime.topic() like 'tenant:%:products'
  );

-- Staff can receive all channels for their own client
create policy "staff_own_client_channels" on realtime.messages
  for select using (
    auth.role() = 'authenticated' and
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'client_staff' and
    realtime.topic() like 'tenant:' || (auth.jwt() -> 'app_metadata' ->> 'client_id') || ':%'
  );

-- Service role can receive any channel
create policy "service_role_all_channels" on realtime.messages
  for select using (auth.role() = 'service_role');
