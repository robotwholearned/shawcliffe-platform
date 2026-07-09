-- Per-client component gating (Tier 0).
-- Which of the 25 platform components are turned on for each client.
-- Native text[] instead of a join table — nothing in scope needs per-component
-- settings today (YAGNI); migrate to a table if that changes.
-- clients RLS stays service_role_only (002_rls_policies.sql); sellers read this
-- through the service-role /api/seller/components route, not directly.
alter table clients add column enabled_components text[] not null default '{}';
