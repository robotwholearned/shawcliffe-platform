-- Multi-device push tokens (R5.8/R5.9/R5.10 in the PRD) — supersedes the
-- single customers.apns_token/fcm_token columns, which silently dropped
-- delivery to a customer's other device on re-registration and had no way
-- to invalidate a dead token or track APNs sandbox vs production per token.

create table push_tokens (
  client_id      uuid        not null references clients(id) on delete cascade,
  id             uuid        not null default gen_random_uuid(),
  customer_id    uuid        not null,
  platform       text        not null check (platform in ('ios', 'android')),
  token          text        not null,
  -- iOS only: APNs sandbox and production gateways are not interchangeable.
  environment    text        check (environment in ('sandbox', 'production')),
  created_at     timestamptz not null default now(),
  last_seen_at   timestamptz not null default now(),
  invalidated_at timestamptz,
  primary key (client_id, id),
  foreign key (client_id, customer_id) references customers(client_id, id) on delete cascade,
  unique (client_id, token)
);

alter table push_tokens enable row level security;

create policy "service_role_only" on push_tokens
  using (auth.role() = 'service_role');

-- Every registered token so far came from Simulator/dev testing only
-- (no TestFlight or App Store builds exist yet), so sandbox is correct here.
insert into push_tokens (client_id, customer_id, platform, token, environment)
select client_id, id, 'ios', apns_token, 'sandbox'
from customers
where apns_token is not null;

insert into push_tokens (client_id, customer_id, platform, token)
select client_id, id, 'android', fcm_token
from customers
where fcm_token is not null;

alter table customers
  drop column apns_token,
  drop column fcm_token,
  add column push_consent boolean not null default false;
