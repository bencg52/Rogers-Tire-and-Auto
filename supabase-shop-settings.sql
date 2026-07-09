-- Shop settings used by the admin system.
-- Run this once in Supabase SQL Editor.

create table if not exists admin_shop_settings (
  id integer primary key default 1 check (id = 1),
  shop_labor_rate numeric(10,2) not null default 175.00,
  sales_tax_rate numeric(6,4) not null default 0.06,
  updated_at timestamptz not null default now()
);

insert into admin_shop_settings (id, shop_labor_rate, sales_tax_rate)
values (1, 175.00, 0.06)
on conflict (id) do update set
  shop_labor_rate = excluded.shop_labor_rate,
  sales_tax_rate = excluded.sales_tax_rate,
  updated_at = now();

alter table admin_shop_settings enable row level security;

drop policy if exists "Allow anon full access to shop settings" on admin_shop_settings;
create policy "Allow anon full access to shop settings"
on admin_shop_settings
for all
to anon
using (true)
with check (true);

grant all on table admin_shop_settings to anon;
grant all on table admin_shop_settings to authenticated;
