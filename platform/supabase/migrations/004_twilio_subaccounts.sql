-- Per-client Twilio subaccount credentials
-- Stored server-side only — never exposed to the client browser.

create table twilio_subaccounts (
  client_id        uuid        primary key references clients(id) on delete cascade,
  account_sid      text        not null,
  auth_token       text        not null,
  phone_number     text        not null,
  messaging_service_sid text,
  created_at       timestamptz not null default now()
);

alter table twilio_subaccounts enable row level security;

-- Service role only — credentials must never be readable by client JWT
create policy "service_role_only" on twilio_subaccounts
  using (auth.role() = 'service_role');
