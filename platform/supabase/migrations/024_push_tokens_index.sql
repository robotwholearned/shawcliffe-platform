-- Support push token lookups/upserts by (client_id, customer_id), same
-- indexing convention as idx_document_submissions_client_customer,
-- idx_vehicles_client_customer, idx_pets_client_customer, and
-- idx_properties_client_customer.
create index if not exists idx_push_tokens_client_customer on push_tokens (client_id, customer_id);
