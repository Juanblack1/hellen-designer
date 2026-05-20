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

revoke execute on function public.is_booking_admin() from public, anon;
grant execute on function public.is_booking_admin() to authenticated;

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
  ('design-reconstrutivo', 'Design reconstrutivo', 45, 2000, 'Tecnica que modela os fios usando mapeamento e medidas faciais para sobrancelhas harmoniosas e naturais.', true, 10),
  ('design-com-henna', 'Design com henna', 60, 3000, 'Define, cobre falhas, alonga e da destaque com acabamento delicado para pele e pelos.', true, 20),
  ('design-com-coloracao', 'Design com coloracao', 70, 4000, 'Realce natural da sobrancelha com coloracao suave e efeito sombreado de fundo.', true, 30),
  ('epilacao-buco', 'Epilacao de buco', 20, 1000, 'Tecnica feita na cera, removendo os pelos desde a raiz e oferecendo resultado duradouro.', true, 40)
on conflict (id) do update set
  name = excluded.name,
  duration_minutes = excluded.duration_minutes,
  price_cents = excluded.price_cents,
  description = excluded.description,
  active = excluded.active,
  sort_order = excluded.sort_order,
  updated_at = now();

update public.service_catalog
set active = false,
    updated_at = now()
where id in ('design-estrategico', 'brow-lamination', 'henna-natural', 'revitalizacao');

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid not null references auth.users(id) on delete cascade,
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

create table if not exists public.admin_unavailable_days (
  id uuid primary key default gen_random_uuid(),
  unavailable_date date not null unique,
  reason text check (reason is null or char_length(reason) <= 240),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bookings_user_id_idx on public.bookings (user_id);
create index if not exists bookings_service_id_idx on public.bookings (service_id);
create index if not exists bookings_date_status_idx on public.bookings (preferred_date, status);
create unique index if not exists bookings_unique_active_slot_idx
on public.bookings (preferred_date, preferred_time)
where status in ('pending', 'confirmed');
create index if not exists service_catalog_active_sort_idx on public.service_catalog (active, sort_order);
create index if not exists admin_unavailable_days_date_idx on public.admin_unavailable_days (unavailable_date);
create index if not exists admin_unavailable_days_created_by_idx on public.admin_unavailable_days (created_by);

create or replace function public.ensure_booking_date_available()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status in ('pending', 'confirmed') then
    if extract(isodow from new.preferred_date) in (6, 7) then
      raise exception 'booking_date_unavailable';
    end if;

    if exists (
      select 1
      from public.admin_unavailable_days unavailable_day
      where unavailable_day.unavailable_date = new.preferred_date
    ) then
      raise exception 'booking_date_unavailable';
    end if;
  end if;

  return new;
end;
$$;

revoke execute on function public.ensure_booking_date_available() from public, anon, authenticated;

drop trigger if exists bookings_ensure_date_available on public.bookings;
create trigger bookings_ensure_date_available
before insert or update of preferred_date, status
on public.bookings
for each row
execute function public.ensure_booking_date_available();

create or replace function public.get_booked_slots(slot_date date)
returns table (preferred_time time)
language sql
stable
security definer
set search_path = public
as $$
  select b.preferred_time
  from public.bookings b
  where b.preferred_date = slot_date
    and b.status in ('pending', 'confirmed')
  order by b.preferred_time;
$$;

revoke execute on function public.get_booked_slots(date) from public, anon;
grant execute on function public.get_booked_slots(date) to authenticated;

alter table public.admin_profiles enable row level security;
alter table public.service_catalog enable row level security;
alter table public.bookings enable row level security;
alter table public.admin_unavailable_days enable row level security;

drop policy if exists "Admins and owners can read admin profiles" on public.admin_profiles;
create policy "Admins and owners can read admin profiles"
on public.admin_profiles
for select
to authenticated
using (user_id = (select auth.uid()) or (select public.is_booking_admin()));

drop policy if exists "Only admins can write admin profiles" on public.admin_profiles;
drop policy if exists "Admins can insert admin profiles" on public.admin_profiles;
create policy "Admins can insert admin profiles"
on public.admin_profiles
for insert
to authenticated
with check ((select public.is_booking_admin()));

drop policy if exists "Admins can update admin profiles" on public.admin_profiles;
create policy "Admins can update admin profiles"
on public.admin_profiles
for update
to authenticated
using ((select public.is_booking_admin()))
with check ((select public.is_booking_admin()));

drop policy if exists "Admins can delete admin profiles" on public.admin_profiles;
create policy "Admins can delete admin profiles"
on public.admin_profiles
for delete
to authenticated
using ((select public.is_booking_admin()));

drop policy if exists "Anyone can read active services" on public.service_catalog;
drop policy if exists "Visitors can read active services" on public.service_catalog;
create policy "Visitors can read active services"
on public.service_catalog
for select
to anon
using (active = true);

drop policy if exists "Users can read active services" on public.service_catalog;
create policy "Users can read active services"
on public.service_catalog
for select
to authenticated
using (active = true or (select public.is_booking_admin()));

drop policy if exists "Admins can manage services" on public.service_catalog;
drop policy if exists "Admins can insert services" on public.service_catalog;
create policy "Admins can insert services"
on public.service_catalog
for insert
to authenticated
with check ((select public.is_booking_admin()));

drop policy if exists "Admins can update services" on public.service_catalog;
create policy "Admins can update services"
on public.service_catalog
for update
to authenticated
using ((select public.is_booking_admin()))
with check ((select public.is_booking_admin()));

drop policy if exists "Admins can delete services" on public.service_catalog;
create policy "Admins can delete services"
on public.service_catalog
for delete
to authenticated
using ((select public.is_booking_admin()));

drop policy if exists "Anyone can request a booking" on public.bookings;
drop policy if exists "Authenticated users can request a booking" on public.bookings;
create policy "Authenticated users can request a booking"
on public.bookings
for insert
to authenticated
with check (user_id = (select auth.uid()) or (select public.is_booking_admin()));

drop policy if exists "Users and admins can read bookings" on public.bookings;
create policy "Users and admins can read bookings"
on public.bookings
for select
to authenticated
using (user_id = (select auth.uid()) or (select public.is_booking_admin()));

drop policy if exists "Admins can update bookings" on public.bookings;
create policy "Admins can update bookings"
on public.bookings
for update
to authenticated
using ((select public.is_booking_admin()))
with check ((select public.is_booking_admin()));

drop policy if exists "Admins can delete bookings" on public.bookings;
create policy "Admins can delete bookings"
on public.bookings
for delete
to authenticated
using ((select public.is_booking_admin()));

drop policy if exists "Users can read unavailable days" on public.admin_unavailable_days;
create policy "Users can read unavailable days"
on public.admin_unavailable_days
for select
to authenticated
using (true);

drop policy if exists "Admins can insert unavailable days" on public.admin_unavailable_days;
create policy "Admins can insert unavailable days"
on public.admin_unavailable_days
for insert
to authenticated
with check ((select public.is_booking_admin()));

drop policy if exists "Admins can update unavailable days" on public.admin_unavailable_days;
create policy "Admins can update unavailable days"
on public.admin_unavailable_days
for update
to authenticated
using ((select public.is_booking_admin()))
with check ((select public.is_booking_admin()));

drop policy if exists "Admins can delete unavailable days" on public.admin_unavailable_days;
create policy "Admins can delete unavailable days"
on public.admin_unavailable_days
for delete
to authenticated
using ((select public.is_booking_admin()));

commit;
