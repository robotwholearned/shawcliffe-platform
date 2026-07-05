-- Seasonal pause: a client can go off-season without suspending their storefront.
-- Distinct from `active` (suspend/deprovision) — paused clients keep their page live,
-- this just flags reduced-billing/off-season status for admin tracking.

alter table clients
  add column paused boolean not null default false;
