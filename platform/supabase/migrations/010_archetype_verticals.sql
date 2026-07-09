-- Replace the 4 placeholder verticals with the 12 business archetypes
-- from the Shawcliffe Digital Operations Guide (Section 2).
--
-- Constraint is dropped before the UPDATE (not after) because some rows may
-- already carry a new-archetype value (written by app code ahead of this
-- migration) that the old 4-value constraint would reject on rewrite, even
-- via the case statement's own `else vertical` no-op branch.
alter table clients drop constraint clients_vertical_check;

update clients set vertical = case vertical
  when 'produce_seller' then 'mobile_popup_sellers'
  when 'baker'          then 'food_producers_specialty_makers'
  when 'cleaner'        then 'home_property_maintenance'
  when 'welder'         then 'home_service_trades'
  else vertical
end;

alter table clients add constraint clients_vertical_check check (vertical in (
  'personal_care_appointment',
  'home_service_trades',
  'home_property_maintenance',
  'food_producers_specialty_makers',
  'mobile_popup_sellers',
  'pet_animal_services',
  'vehicle_equipment_services',
  'creative_event_services',
  'education_coaching_instruction',
  'health_adjacent_professionals',
  'local_retail_boutique',
  'professional_local_services'
));
