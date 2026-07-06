-- Cloudflare for SaaS custom domain tracking (Tier 2 feature).

alter table client_branding
  add column custom_hostname_id text,
  add column custom_domain_status text not null default 'not_started'
    check (custom_domain_status in ('not_started', 'pending', 'active', 'error')),
  add column custom_domain_ssl_status text,
  add column custom_domain_verification jsonb,
  add column custom_domain_updated_at timestamptz;

-- Narrow, safe lookup for middleware to route an unrecognized custom domain
-- to its client's slug, without granting anon access to the full (service-
-- role-only) clients table. Views run with the owner's privileges against
-- the underlying tables, so this bypasses clients' RLS deliberately and only
-- for these three columns.
create or replace view custom_domain_lookup as
  select cb.custom_domain, c.slug, c.active
  from client_branding cb
  join clients c on c.id = cb.client_id
  where cb.custom_domain is not null;

grant select on custom_domain_lookup to anon, authenticated;
