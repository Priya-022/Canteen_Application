create table if not exists public.canteen_menu (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 80),
  category text not null check (char_length(trim(category)) between 1 and 60),
  price numeric(7, 2) not null check (price >= 0 and price <= 99999.99),
  is_available boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.canteen_menu enable row level security;

revoke all on public.canteen_menu from anon, authenticated;
grant select on public.canteen_menu to anon, authenticated;
grant insert, update, delete on public.canteen_menu to authenticated;

drop policy if exists "Anyone can read the canteen menu" on public.canteen_menu;
create policy "Anyone can read the canteen menu"
on public.canteen_menu for select
to anon, authenticated
using (true);

drop policy if exists "Admins can add canteen menu items" on public.canteen_menu;
create policy "Admins can add canteen menu items"
on public.canteen_menu for insert
to authenticated
with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Admins can update canteen menu items" on public.canteen_menu;
create policy "Admins can update canteen menu items"
on public.canteen_menu for update
to authenticated
using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Admins can delete canteen menu items" on public.canteen_menu;
create policy "Admins can delete canteen menu items"
on public.canteen_menu for delete
to authenticated
using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create table if not exists public.admin_login_users (
  username text primary key
    check (username ~ '^[a-z0-9][a-z0-9._-]{2,31}$'),
  user_id uuid not null unique references auth.users (id) on delete cascade
);

alter table public.admin_login_users enable row level security;
revoke all on table public.admin_login_users from public, anon, authenticated;
grant select on table public.admin_login_users to service_role;
