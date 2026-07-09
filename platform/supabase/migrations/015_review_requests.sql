-- Review Request System (Tier 1, component key `review_request_system`).
-- Manual "request a review" trigger: seller sends an existing customer an
-- SMS/email with the client's Google review link (see agency/Shawcliffe
-- Digital Operations Guide.html, section 3.11). No new domain table — reuses
-- client_branding for the per-client link/wording and notification_log for
-- the send record, same as every other outbound channel in this schema.
alter table client_branding
  add column google_review_url text,
  add column review_request_message text check (char_length(review_request_message) <= 300);
