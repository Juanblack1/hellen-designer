begin;

create extension if not exists pgcrypto;

create table if not exists public.admin_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_booking_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_profiles
    where user_id = auth.uid()
  );
$$;

grant execute on function public.is_booking_admin() to anon, authenticated;

create table if not exists public.service_catalog (
  id text primary key,
  name text not null,
  duration_minutes integer not null check (duration_minutes between 15 and 240),
  price_cents integer check (price_cents is null or price_cents >= 0),
  description text not null,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.service_catalog (id, name, duration_minutes, price_cents, description, active, sort_order)
values
  ('design-estrategico', 'Design estrategico', 60, 9500, 'Mapeamento facial, limpeza precisa e finalizacao natural para valorizar o olhar sem pesar.', true, 10),
  ('brow-lamination', 'Brow lamination', 75, 16000, 'Alinhamento dos fios com acabamento editorial para sobrancelhas mais cheias e disciplinadas.', true, 20),
  ('henna-natural', 'Henna natural', 70, 12500, 'Preenchimento delicado e personalizado para corrigir falhas mantendo textura realista.', true, 30),
  ('revitalizacao', 'Revitalizacao do olhar', 90, 19000, 'Combo de design, nutricao dos fios e finalizacao beauty para eventos ou fotos.', true, 40)
on conflict (id) do update set
  name = excluded.name,
  duration_minutes = excluded.duration_minutes,
  price_cents = excluded.price_cents,
  description = excluded.description,
  active = excluded.active,
  sort_order = excluded.sort_order,
  updated_at = now();

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid references auth.users(id) on delete set null,
  client_name text not null check (char_length(client_name) between 2 and 120),
  client_email text not null check (char_length(client_email) <= 160),
  client_phone text not null check (char_length(client_phone) between 8 and 30),
  service_id text references public.service_catalog(id) on update cascade,
  service_name text not null,
  preferred_date date not null,
  preferred_time time not null,
  notes text check (notes is null or char_length(notes) <= 1200),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'cancelled', 'done')),
  source text not null default 'site'
);

create index if not exists bookings_user_id_idx on public.bookings (user_id);
create index if not exists bookings_date_status_idx on public.bookings (preferred_date, status);
create index if not exists service_catalog_active_sort_idx on public.service_catalog (active, sort_order);

alter table public.admin_profiles enable row level security;
alter table public.service_catalog enable row level security;
alter table public.bookings enable row level security;

drop policy if exists "Admins and owners can read admin profiles" on public.admin_profiles;
create policy "Admins and owners can read admin profiles"
on public.admin_profiles
for select
to authenticated
using (user_id = auth.uid() or public.is_booking_admin());

drop policy if exists "Only admins can write admin profiles" on public.admin_profiles;
create policy "Only admins can write admin profiles"
on public.admin_profiles
for all
to authenticated
using (public.is_booking_admin())
with check (public.is_booking_admin());

drop policy if exists "Anyone can read active services" on public.service_catalog;
create policy "Anyone can read active services"
on public.service_catalog
for select
to anon, authenticated
using (active = true or public.is_booking_admin());

drop policy if exists "Admins can manage services" on public.service_catalog;
create policy "Admins can manage services"
on public.service_catalog
for all
to authenticated
using (public.is_booking_admin())
with check (public.is_booking_admin());

drop policy if exists "Anyone can request a booking" on public.bookings;
create policy "Anyone can request a booking"
on public.bookings
for insert
to anon, authenticated
with check (user_id is null or user_id = auth.uid() or public.is_booking_admin());

drop policy if exists "Users and admins can read bookings" on public.bookings;
create policy "Users and admins can read bookings"
on public.bookings
for select
to authenticated
using (user_id = auth.uid() or public.is_booking_admin());

drop policy if exists "Admins can update bookings" on public.bookings;
create policy "Admins can update bookings"
on public.bookings
for update
to authenticated
using (public.is_booking_admin())
with check (public.is_booking_admin());

drop policy if exists "Admins can delete bookings" on public.bookings;
create policy "Admins can delete bookings"
on public.bookings
for delete
to authenticated
using (public.is_booking_admin());

commit;
