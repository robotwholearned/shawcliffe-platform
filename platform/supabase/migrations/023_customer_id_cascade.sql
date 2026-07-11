-- The (client_id, customer_id) -> customers FK was missing ON DELETE CASCADE
-- on seven tables, so de-provisioning any client with preorder/inquiry/
-- booking/document/vehicle/pet/property history would fail with a foreign
-- key violation (customers can't be deleted while these rows still
-- reference them). push_tokens (009_push_tokens.sql) already cascades this
-- same FK shape; same bug class already fixed once for preorder_items ->
-- products in 008_preorder_items_product_cascade.sql.

alter table preorders
  drop constraint preorders_client_id_customer_id_fkey,
  add constraint preorders_client_id_customer_id_fkey
    foreign key (client_id, customer_id) references customers(client_id, id) on delete cascade;

alter table inquiries
  drop constraint inquiries_client_id_customer_id_fkey,
  add constraint inquiries_client_id_customer_id_fkey
    foreign key (client_id, customer_id) references customers(client_id, id) on delete cascade;

alter table bookings
  drop constraint bookings_client_id_customer_id_fkey,
  add constraint bookings_client_id_customer_id_fkey
    foreign key (client_id, customer_id) references customers(client_id, id) on delete cascade;

alter table document_submissions
  drop constraint document_submissions_client_id_customer_id_fkey,
  add constraint document_submissions_client_id_customer_id_fkey
    foreign key (client_id, customer_id) references customers(client_id, id) on delete cascade;

alter table vehicles
  drop constraint vehicles_client_id_customer_id_fkey,
  add constraint vehicles_client_id_customer_id_fkey
    foreign key (client_id, customer_id) references customers(client_id, id) on delete cascade;

alter table pets
  drop constraint pets_client_id_customer_id_fkey,
  add constraint pets_client_id_customer_id_fkey
    foreign key (client_id, customer_id) references customers(client_id, id) on delete cascade;

alter table properties
  drop constraint properties_client_id_customer_id_fkey,
  add constraint properties_client_id_customer_id_fkey
    foreign key (client_id, customer_id) references customers(client_id, id) on delete cascade;
