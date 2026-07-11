-- Google Places validation for the property address (019): place_id ties the
-- address to a resolved Places result, address_verified flags whether the
-- customer picked a suggestion vs. typing free text.
alter table properties add column place_id text;
alter table properties add column address_verified boolean not null default false;
