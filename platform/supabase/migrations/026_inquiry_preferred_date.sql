-- Preferred date for a quote/inquiry (optional). Customer-facing quote forms
-- (web + iOS + Android) send it as YYYY-MM-DD; staff see it on the inquiry.
-- Additive nullable column: no backfill, no RLS change.
alter table inquiries add column preferred_date date;
