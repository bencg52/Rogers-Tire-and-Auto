alter table public.services enable row level security;
drop policy if exists "Public can read active services" on public.services;
create policy "Public can read active services" on public.services
for select using (active = true);

