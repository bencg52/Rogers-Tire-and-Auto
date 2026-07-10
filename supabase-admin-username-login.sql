-- Adds username login support for admin users.
-- Website login shows username + password.
-- Supabase still signs in with the user's email behind the scenes.

alter table public.admin_users
add column if not exists username text;

create unique index if not exists admin_users_username_lower_key
on public.admin_users (lower(username))
where username is not null;

create or replace function public.admin_login_email(login_username text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select email
  from public.admin_users
  where lower(username) = lower(trim(login_username))
    and active = true
  limit 1;
$$;

revoke all on function public.admin_login_email(text) from public;
grant execute on function public.admin_login_email(text) to anon, authenticated;

-- Change username/email here if needed.
insert into public.admin_users (user_id, email, username, role, active)
select id, email, 'admin', 'owner', true
from auth.users
where email = 'bencg3@gmail.com'
on conflict (user_id) do update set
  email = excluded.email,
  username = excluded.username,
  role = excluded.role,
  active = true,
  updated_at = now();
