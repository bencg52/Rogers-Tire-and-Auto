-- Adds a free-text vehicle field for Walk-In / No Customer repair orders.
alter table public.admin_repair_orders
add column if not exists walk_in_vehicle text;
