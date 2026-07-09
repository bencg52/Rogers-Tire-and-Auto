-- Rogers Tire -N- Auto admin auth + RLS cleanup.
-- Run this in the Supabase SQL Editor after creating at least one Auth user.
--
-- IMPORTANT:
-- 1. In Supabase Dashboard > Authentication > Users, create the admin login user.
-- 2. Copy that user's UUID.
-- 3. After the admin_users table is created, run the insert block below with your UUID/email.

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'admin',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Replace the UUID/email below with your Supabase Auth user.
-- Run this insert once for each admin user.
--
-- insert into public.admin_users (user_id, email, role, active)
-- values ('00000000-0000-0000-0000-000000000000', 'owner@example.com', 'owner', true)
-- on conflict (user_id) do update set
--   email = excluded.email,
--   role = excluded.role,
--   active = excluded.active,
--   updated_at = now();

alter table public.admin_users enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
      and active = true
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

revoke all on table public.admin_users from anon;
grant select, insert, update, delete on table public.admin_users to authenticated;

drop policy if exists "Admins can read admin users" on public.admin_users;
drop policy if exists "Admins can manage admin users" on public.admin_users;

create policy "Admins can read admin users"
on public.admin_users
for select
to authenticated
using (public.is_admin());

create policy "Admins can manage admin users"
on public.admin_users
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Public website services stay readable, but only active services are exposed.
alter table public.services enable row level security;
grant select on table public.services to anon, authenticated;

drop policy if exists "Public can read active services" on public.services;
create policy "Public can read active services"
on public.services
for select
to anon, authenticated
using (active = true);

-- Lock down admin tables. This loop skips tables that do not exist yet.
do $$
declare
  admin_table text;
begin
  foreach admin_table in array array[
    'admin_customers',
    'admin_vehicles',
    'admin_repair_orders',
    'admin_invoice_items',
    'admin_shop_settings'
  ]
  loop
    if to_regclass(format('public.%I', admin_table)) is not null then
      execute format('alter table public.%I enable row level security', admin_table);

      execute format('revoke all on table public.%I from anon', admin_table);
      execute format('grant select, insert, update, delete on table public.%I to authenticated', admin_table);

      execute format('drop policy if exists "Allow anon full access to invoice items" on public.%I', admin_table);
      execute format('drop policy if exists "Allow authenticated full access to invoice items" on public.%I', admin_table);
      execute format('drop policy if exists "Allow public access to invoice items" on public.%I', admin_table);
      execute format('drop policy if exists "Allow invoice items read" on public.%I', admin_table);
      execute format('drop policy if exists "Allow invoice items insert" on public.%I', admin_table);
      execute format('drop policy if exists "Allow invoice items update" on public.%I', admin_table);
      execute format('drop policy if exists "Allow invoice items delete" on public.%I', admin_table);
      execute format('drop policy if exists "Allow anon full access to shop settings" on public.%I', admin_table);
      execute format('drop policy if exists "Admins can manage %s" on public.%I', admin_table, admin_table);

      execute format(
        'create policy "Admins can manage %s" on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())',
        admin_table,
        admin_table
      );
    end if;
  end loop;
end $$;
