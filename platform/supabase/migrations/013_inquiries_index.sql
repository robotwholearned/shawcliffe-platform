-- Support the seller inquiries list query (client_id [+ status] filter,
-- ordered by created_at desc) — matches the indexing convention used for
-- daily_status/notification_log in 001_schema.sql rather than relying on
-- the composite PK (client_id, id), which isn't ordered by created_at.
create index idx_inquiries_client_created on inquiries(client_id, created_at desc);
create index idx_inquiries_client_status on inquiries(client_id, status);
