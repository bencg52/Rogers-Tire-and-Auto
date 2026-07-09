-- Run this in Supabase SQL Editor before using the invoice line-item feature.
-- This keeps invoice data in Supabase instead of local browser storage.

create table if not exists public.admin_invoice_items (
  id uuid primary key default gen_random_uuid(),
  repair_order_id uuid not null references public.admin_repair_orders(id) on delete cascade,
  line_number integer not null default 1,
  item_code text,
  description text,
  qty numeric(10,2) not null default 1,
  rate numeric(10,2) not null default 0,
  amount numeric(10,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists admin_invoice_items_repair_order_id_idx
on public.admin_invoice_items(repair_order_id);

alter table public.admin_invoice_items enable row level security;

drop policy if exists "Allow invoice items read" on public.admin_invoice_items;
drop policy if exists "Allow invoice items insert" on public.admin_invoice_items;
drop policy if exists "Allow invoice items update" on public.admin_invoice_items;
drop policy if exists "Allow invoice items delete" on public.admin_invoice_items;
drop policy if exists "Allow public access to invoice items" on public.admin_invoice_items;
drop policy if exists "Allow anon full access to invoice items" on public.admin_invoice_items;

create policy "Allow anon full access to invoice items"
on public.admin_invoice_items
for all
to anon
using (true)
with check (true);

create policy "Allow authenticated full access to invoice items"
on public.admin_invoice_items
for all
to authenticated
using (true)
with check (true);

grant usage on schema public to anon;
grant all on table public.admin_invoice_items to anon;
grant all on table public.admin_invoice_items to authenticated;
