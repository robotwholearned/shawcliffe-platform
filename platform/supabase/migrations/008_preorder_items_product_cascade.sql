-- The preorder_items -> products FK was missing ON DELETE CASCADE, so
-- de-provisioning any client with preorder history failed with a foreign
-- key violation (products can't be deleted while preorder_items still
-- reference them). Found via the V4 de-provisioning drill, 2026-07-06.

alter table preorder_items
  drop constraint preorder_items_client_id_product_id_fkey,
  add constraint preorder_items_client_id_product_id_fkey
    foreign key (client_id, product_id) references products(client_id, id) on delete cascade;
