-- CI test seed data — two isolated clients for V1 tenant isolation tests
-- NEVER run this in production.

insert into clients (id, slug, business_name, vertical, tier, operator_email, active) values
  ('00000000-0000-0000-0000-000000000001', 'test-client-a', 'Test Client A', 'produce_seller', 1, 'a@test.internal', true),
  ('00000000-0000-0000-0000-000000000002', 'test-client-b', 'Test Client B', 'produce_seller', 1, 'b@test.internal', true)
on conflict (id) do nothing;

insert into client_branding (client_id, app_name, primary_color) values
  ('00000000-0000-0000-0000-000000000001', 'Client A', '#2563eb'),
  ('00000000-0000-0000-0000-000000000002', 'Client B', '#dc2626')
on conflict (client_id) do nothing;

insert into products (client_id, id, name, status, sort_order) values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0001-0000-000000000001', 'Client A Product', 'available', 0),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0002-0000-000000000001', 'Client B Product', 'available', 0)
on conflict (client_id, id) do nothing;

insert into daily_status (client_id, id, date, status) values
  ('00000000-0000-0000-0000-000000000001', '00000000-0001-0000-0000-000000000001', current_date, 'open'),
  ('00000000-0000-0000-0000-000000000002', '00000000-0002-0000-0000-000000000001', current_date, 'open')
on conflict (client_id, date) do nothing;

-- Supabase Auth users for CI are created via the Admin API in CI setup scripts.
-- See platform/tests/tenant-isolation/README.md for setup instructions.
