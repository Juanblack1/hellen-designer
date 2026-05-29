begin;

create extension if not exists pgcrypto;

create schema if not exists app_private;

revoke all on schema app_private from public, anon, authenticated;
grant usage on schema app_private to authenticated;

create table if not exists public.admin_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'admin' check (role in ('owner', 'admin')),
  created_at timestamptz not null default now()
);

create or replace function app_private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.admin_profiles
    where user_id = auth.uid()
  );
$$;

revoke execute on function app_private.is_admin() from public;
grant execute on function app_private.is_admin() to anon, authenticated;

create table if not exists public.business_profile (
  id text primary key default 'default',
  brand_name text not null check (char_length(brand_name) between 2 and 120),
  subtitle text not null check (char_length(subtitle) between 2 and 160),
  bio text not null check (char_length(bio) between 20 and 1200),
  phone text not null check (char_length(phone) between 8 and 40),
  whatsapp_number text not null check (char_length(whatsapp_number) between 10 and 24),
  instagram_handle text not null check (char_length(instagram_handle) between 2 and 80),
  instagram_url text not null check (char_length(instagram_url) between 8 and 300),
  address text not null default 'Atendimento por agendamento',
  published boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.business_profile (
  id,
  brand_name,
  subtitle,
  bio,
  phone,
  whatsapp_number,
  instagram_handle,
  instagram_url,
  address,
  published
) values (
  'default',
  'Hellen Martins',
  'Designer de Sobrancelhas',
  'Atendimento com hora marcada para realcar a beleza natural das sobrancelhas com desenho personalizado, henna, coloracao e acabamento delicado.',
  '(16) 98875-8633',
  '5516988758633',
  '@hellenmartins.designer',
  'https://www.instagram.com/hellenmartins.designer/',
  'Atendimento por agendamento',
  true
)
on conflict (id) do nothing;

create table if not exists public.services (
  id text primary key default gen_random_uuid()::text,
  name text not null check (char_length(name) between 2 and 120),
  description text not null check (char_length(description) between 2 and 700),
  duration_minutes integer not null default 45 check (duration_minutes between 5 and 360),
  price_cents integer not null default 0 check (price_cents >= 0),
  active boolean not null default true,
  published boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.services (id, name, description, duration_minutes, price_cents, active, published, sort_order)
values
  ('design-reconstrutivo', 'Design Reconstrutivo', 'Mapeamento e medidas faciais para sobrancelhas harmoniosas e naturais.', 45, 2000, true, true, 10),
  ('design-com-henna', 'Design com Henna', 'Define, cobre falhas e destaca pele e pelos com acabamento delicado.', 60, 3000, true, true, 20),
  ('design-com-coloracao', 'Design com Coloracao', 'Realce natural com coloracao suave e leve sombreado de fundo.', 70, 4000, true, true, 30),
  ('epilacao-buco', 'Epilacao de Buco', 'Remocao dos pelos desde a raiz para acabamento limpo e duradouro.', 20, 1000, true, true, 40)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  duration_minutes = excluded.duration_minutes,
  price_cents = excluded.price_cents,
  active = excluded.active,
  published = excluded.published,
  sort_order = excluded.sort_order,
  updated_at = now();

create table if not exists public.gallery_items (
  id text primary key default gen_random_uuid()::text,
  title text not null check (char_length(title) between 2 and 120),
  image_path text not null check (char_length(image_path) between 2 and 700),
  alt_text text not null check (char_length(alt_text) between 2 and 300),
  published boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.gallery_items (id, title, image_path, alt_text, published, sort_order)
values
  ('logo-hm', 'Logo Hellen Martins', 'brandLogo', 'Logo Hellen Martins Designer de Sobrancelhas', true, 10),
  ('brand-banner', 'Arte da marca', 'brandBanner', 'Arte preta e dourada com monograma HM', true, 20),
  ('care-card', 'Cada detalhe com carinho', 'careCard', 'Arte de agradecimento da Hellen Martins', true, 30),
  ('portrait', 'Resultado natural', 'portrait', 'Retrato beauty com sobrancelhas naturais', true, 40)
on conflict (id) do nothing;

create table if not exists public.clients (
  id text primary key default gen_random_uuid()::text,
  full_name text not null check (char_length(full_name) between 2 and 140),
  phone text not null unique check (char_length(phone) between 8 and 40),
  birth_date date,
  notes text not null default '' check (char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.clients add column if not exists birth_date date;

create table if not exists public.appointments (
  id text primary key default gen_random_uuid()::text,
  client_id text references public.clients(id) on delete set null,
  client_name text not null check (char_length(client_name) between 2 and 140),
  client_phone text not null check (char_length(client_phone) between 8 and 40),
  service_id text references public.services(id) on update cascade on delete set null,
  service_name text not null check (char_length(service_name) between 2 and 140),
  scheduled_date date not null,
  start_time time not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'confirmed', 'completed', 'no_show', 'canceled')),
  charged_amount_cents integer not null default 0 check (charged_amount_cents >= 0),
  received_amount_cents integer not null default 0 check (received_amount_cents >= 0),
  payment_method text not null default 'pix' check (payment_method in ('pix', 'cash', 'debit_card', 'credit_card')),
  notes text not null default '' check (char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointments_received_not_above_charged_check check (received_amount_cents <= charged_amount_cents)
);

create index if not exists appointments_date_time_idx on public.appointments (scheduled_date, start_time);
create index if not exists appointments_client_id_idx on public.appointments (client_id);
create index if not exists appointments_status_idx on public.appointments (status);
create unique index if not exists appointments_unique_active_slot_idx
on public.appointments (scheduled_date, start_time)
where status in ('scheduled', 'confirmed', 'completed');

create table if not exists public.products (
  id text primary key default gen_random_uuid()::text,
  name text not null check (char_length(name) between 2 and 140),
  category text not null check (char_length(category) between 2 and 80),
  quantity integer not null default 0 check (quantity >= 0),
  unit_cost_cents integer not null default 0 check (unit_cost_cents >= 0),
  sale_price_cents integer not null default 0 check (sale_price_cents >= 0),
  minimum_quantity integer not null default 0 check (minimum_quantity >= 0),
  notes text not null default '' check (char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.stock_movements (
  id text primary key default gen_random_uuid()::text,
  product_id text references public.products(id) on delete cascade,
  product_name text not null check (char_length(product_name) between 2 and 140),
  type text not null check (type in ('in', 'out', 'service_use', 'sale', 'adjustment')),
  quantity integer not null check (quantity > 0),
  notes text not null default '' check (char_length(notes) <= 1000),
  created_at timestamptz not null default now()
);

create index if not exists products_category_idx on public.products (category);
create index if not exists stock_movements_product_id_idx on public.stock_movements (product_id);

insert into public.products (
  id,
  name,
  category,
  quantity,
  unit_cost_cents,
  sale_price_cents,
  minimum_quantity,
  notes
)
values
  ('henna-castanho', 'Henna castanho medio', 'Henna', 2, 1800, 0, 3, 'Repor antes do fim de semana.'),
  ('algodao', 'Algodao', 'Consumo', 6, 700, 0, 4, ''),
  ('pinca-dourada', 'Pinca dourada', 'Instrumento', 1, 3500, 0, 2, 'Separar uma reserva para atendimentos.')
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'landing-media',
  'landing-media',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists business_profile_touch_updated_at on public.business_profile;
create trigger business_profile_touch_updated_at
before update on public.business_profile
for each row execute function public.touch_updated_at();

drop trigger if exists services_touch_updated_at on public.services;
create trigger services_touch_updated_at
before update on public.services
for each row execute function public.touch_updated_at();

drop trigger if exists gallery_items_touch_updated_at on public.gallery_items;
create trigger gallery_items_touch_updated_at
before update on public.gallery_items
for each row execute function public.touch_updated_at();

drop trigger if exists clients_touch_updated_at on public.clients;
create trigger clients_touch_updated_at
before update on public.clients
for each row execute function public.touch_updated_at();

drop trigger if exists appointments_touch_updated_at on public.appointments;
create trigger appointments_touch_updated_at
before update on public.appointments
for each row execute function public.touch_updated_at();

drop trigger if exists products_touch_updated_at on public.products;
create trigger products_touch_updated_at
before update on public.products
for each row execute function public.touch_updated_at();

grant select on public.business_profile to anon, authenticated;
grant select on public.services to anon, authenticated;
grant select on public.gallery_items to anon, authenticated;
grant insert on public.clients to anon;
grant insert on public.appointments to anon;
grant select, insert, update, delete on public.clients to authenticated, service_role;
grant select, insert, update, delete on public.appointments to authenticated, service_role;
grant select, insert, update, delete on public.products to authenticated, service_role;
grant select, insert, update, delete on public.stock_movements to authenticated, service_role;
grant insert, update, delete on public.business_profile to authenticated, service_role;
grant insert, update, delete on public.services to authenticated, service_role;
grant insert, update, delete on public.gallery_items to authenticated, service_role;

alter table public.admin_profiles enable row level security;
alter table public.business_profile enable row level security;
alter table public.services enable row level security;
alter table public.gallery_items enable row level security;
alter table public.clients enable row level security;
alter table public.appointments enable row level security;
alter table public.products enable row level security;
alter table public.stock_movements enable row level security;

drop policy if exists "Admins can read admin profiles" on public.admin_profiles;
create policy "Admins can read admin profiles"
on public.admin_profiles
for select
to authenticated
using (user_id = auth.uid() or app_private.is_admin());

drop policy if exists "Owners can insert admin profiles" on public.admin_profiles;
create policy "Owners can insert admin profiles"
on public.admin_profiles
for insert
to authenticated
with check (
  exists (
    select 1
    from public.admin_profiles
    where user_id = auth.uid()
      and role = 'owner'
  )
);

drop policy if exists "Visitors can read published business profile" on public.business_profile;
create policy "Visitors can read published business profile"
on public.business_profile
for select
to anon, authenticated
using (published = true or app_private.is_admin());

drop policy if exists "Admins can manage business profile" on public.business_profile;
create policy "Admins can manage business profile"
on public.business_profile
for all
to authenticated
using (app_private.is_admin())
with check (app_private.is_admin());

drop policy if exists "Visitors can read published services" on public.services;
create policy "Visitors can read published services"
on public.services
for select
to anon, authenticated
using ((active and published) or app_private.is_admin());

drop policy if exists "Admins can manage services" on public.services;
create policy "Admins can manage services"
on public.services
for all
to authenticated
using (app_private.is_admin())
with check (app_private.is_admin());

drop policy if exists "Visitors can read published gallery" on public.gallery_items;
create policy "Visitors can read published gallery"
on public.gallery_items
for select
to anon, authenticated
using (published or app_private.is_admin());

drop policy if exists "Admins can manage gallery" on public.gallery_items;
create policy "Admins can manage gallery"
on public.gallery_items
for all
to authenticated
using (app_private.is_admin())
with check (app_private.is_admin());

drop policy if exists "Admins can manage clients" on public.clients;
create policy "Admins can manage clients"
on public.clients
for all
to authenticated
using (app_private.is_admin())
with check (app_private.is_admin());

drop policy if exists "Visitors can request client booking contact" on public.clients;
create policy "Visitors can request client booking contact"
on public.clients
for insert
to anon
with check (
  char_length(full_name) between 2 and 140
  and char_length(phone) between 8 and 40
);

drop policy if exists "Admins can manage appointments" on public.appointments;
create policy "Admins can manage appointments"
on public.appointments
for all
to authenticated
using (app_private.is_admin())
with check (app_private.is_admin());

drop policy if exists "Visitors can request appointments" on public.appointments;
create policy "Visitors can request appointments"
on public.appointments
for insert
to anon
with check (
  status = 'scheduled'
  and received_amount_cents = 0
  and charged_amount_cents >= 0
  and char_length(client_name) between 2 and 140
  and char_length(client_phone) between 8 and 40
);

drop policy if exists "Admins can manage products" on public.products;
create policy "Admins can manage products"
on public.products
for all
to authenticated
using (app_private.is_admin())
with check (app_private.is_admin());

drop policy if exists "Admins can manage stock movements" on public.stock_movements;
create policy "Admins can manage stock movements"
on public.stock_movements
for all
to authenticated
using (app_private.is_admin())
with check (app_private.is_admin());

drop policy if exists "Visitors can read landing media" on storage.objects;
create policy "Visitors can read landing media"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'landing-media');

drop policy if exists "Admins can upload landing media" on storage.objects;
create policy "Admins can upload landing media"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'landing-media'
  and app_private.is_admin()
  and lower(coalesce(storage.extension(name), '')) in ('jpg', 'jpeg', 'png', 'webp', 'avif')
);

drop policy if exists "Admins can update landing media" on storage.objects;
create policy "Admins can update landing media"
on storage.objects
for update
to authenticated
using (bucket_id = 'landing-media' and app_private.is_admin())
with check (
  bucket_id = 'landing-media'
  and app_private.is_admin()
  and lower(coalesce(storage.extension(name), '')) in ('jpg', 'jpeg', 'png', 'webp', 'avif')
);

drop policy if exists "Admins can delete landing media" on storage.objects;
create policy "Admins can delete landing media"
on storage.objects
for delete
to authenticated
using (bucket_id = 'landing-media' and app_private.is_admin());

commit;
