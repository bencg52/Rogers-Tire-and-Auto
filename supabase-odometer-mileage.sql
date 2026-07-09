-- Adds odometer / mileage-in support for repair orders.
alter table admin_repair_orders
add column if not exists mileage_in text;
