create table if not exists public.appointment_requests (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null,
  email text,
  vehicle_info text,
  requested_service text,
  preferred_date date,
  notes text,
  status text default 'New',
  created_at timestamptz default now()
);

alter table public.services enable row level security;
alter table public.appointment_requests enable row level security;

drop policy if exists "Public can read active services" on public.services;
create policy "Public can read active services" on public.services
for select using (active = true);

drop policy if exists "Public can create appointment requests" on public.appointment_requests;
create policy "Public can create appointment requests" on public.appointment_requests
for insert with check (true);
