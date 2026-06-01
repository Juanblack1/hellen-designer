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
  address text not null default 'Atendimento com horario combinado pelo WhatsApp',
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
  'Design de sobrancelhas para realcar a beleza natural com desenho personalizado, henna, coloracao e acabamento delicado.',
  '(16) 98875-8633',
  '5516988758633',
  '@hellenmartins.designer',
  'https://www.instagram.com/hellenmartins.designer/',
  'Atendimento com horario combinado pelo WhatsApp',
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
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(full_name) between 2 and 140),
  phone text not null unique check (char_length(phone) between 8 and 40),
  birth_date date,
  notes text not null default '' check (char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.clients add column if not exists birth_date date;

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete set null,
  client_name text not null check (char_length(client_name) between 2 and 140),
  client_phone text not null check (char_length(client_phone) between 8 and 40),
  service_id text references public.services(id) on update cascade on delete set null,
  service_name text not null check (char_length(service_name) between 2 and 140),
  scheduled_date date not null,
  start_time time not null,
  end_time time,
  status text not null default 'scheduled' check (status in ('scheduled', 'confirmed', 'completed', 'no_show', 'canceled')),
  charged_amount_cents integer not null default 0 check (charged_amount_cents >= 0),
  received_amount_cents integer not null default 0 check (received_amount_cents >= 0),
  payment_method text not null default 'pix' check (payment_method in ('pix', 'cash', 'debit_card', 'credit_card', 'transfer', 'other')),
  payment_status text not null default 'pending' check (payment_status in ('pending', 'partial', 'paid', 'canceled')),
  payment_canceled_reason text,
  notes text not null default '' check (char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointments_received_not_above_charged_check check (received_amount_cents <= charged_amount_cents)
);

alter table public.appointments add column if not exists end_time time;
alter table public.appointments add column if not exists payment_status text not null default 'pending';
alter table public.appointments add column if not exists payment_canceled_reason text;
alter table public.appointments drop constraint if exists appointments_payment_method_check;
alter table public.appointments add constraint appointments_payment_method_check
check (payment_method in ('pix', 'cash', 'debit_card', 'credit_card', 'transfer', 'other'));
alter table public.appointments drop constraint if exists appointments_payment_status_check;
alter table public.appointments add constraint appointments_payment_status_check
check (payment_status in ('pending', 'partial', 'paid', 'canceled'));
update public.appointments
set payment_status = case
  when payment_status = 'canceled' then 'canceled'
  when received_amount_cents <= 0 then 'pending'
  when received_amount_cents < charged_amount_cents then 'partial'
  else 'paid'
end
where payment_status is null or payment_status = 'pending';

create index if not exists appointments_date_time_idx on public.appointments (scheduled_date, start_time);
create index if not exists appointments_client_id_idx on public.appointments (client_id);
create index if not exists appointments_status_idx on public.appointments (status);
create unique index if not exists appointments_unique_active_slot_idx
on public.appointments (scheduled_date, start_time)
where status in ('scheduled', 'confirmed', 'completed');

create table if not exists public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  amount_cents integer not null check (amount_cents > 0),
  method text not null check (method in ('pix', 'cash', 'debit_card', 'credit_card', 'transfer', 'other')),
  paid_at timestamptz not null default now(),
  notes text not null default '' check (char_length(notes) <= 1000),
  created_at timestamptz not null default now()
);

create index if not exists payment_transactions_appointment_id_idx
on public.payment_transactions (appointment_id, paid_at desc);

create table if not exists public.business_hours (
  id text primary key,
  day_of_week integer not null unique check (day_of_week between 0 and 6),
  is_open boolean not null default false,
  start_time time not null default '09:00',
  end_time time not null default '18:00',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_hours_range_check check (start_time < end_time)
);

create table if not exists public.availability_rules (
  id text primary key default gen_random_uuid()::text,
  day_of_week integer not null check (day_of_week between 0 and 6),
  label text not null default '',
  start_time time not null,
  end_time time not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint availability_rules_range_check check (start_time < end_time)
);

alter table public.availability_rules add column if not exists label text not null default '';

create index if not exists availability_rules_day_idx
on public.availability_rules (day_of_week, active);

create table if not exists public.availability_exceptions (
  id text primary key default gen_random_uuid()::text,
  date date not null,
  type text not null check (type in ('blocked', 'custom_available', 'holiday', 'vacation')),
  start_time time,
  end_time time,
  reason text not null default '' check (char_length(reason) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint availability_exceptions_range_check check (
    (type in ('holiday', 'vacation') and start_time is null and end_time is null)
    or (type in ('blocked', 'custom_available') and start_time is not null and end_time is not null and start_time < end_time)
  )
);

create index if not exists availability_exceptions_date_idx
on public.availability_exceptions (date, type);

create table if not exists public.schedule_settings (
  id text primary key default 'default',
  slot_interval_minutes integer not null default 30 check (slot_interval_minutes in (15, 30, 60)),
  buffer_between_services_minutes integer not null default 0 check (buffer_between_services_minutes >= 0),
  minimum_notice_hours integer not null default 0 check (minimum_notice_hours >= 0),
  max_days_ahead integer not null default 60 check (max_days_ahead >= 0),
  allow_same_day_booking boolean not null default true,
  allow_manual_outside_availability boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.business_hours (id, day_of_week, is_open, start_time, end_time)
values
  ('sun', 0, false, '09:00', '18:00'),
  ('mon', 1, false, '09:00', '18:00'),
  ('tue', 2, true, '09:00', '18:00'),
  ('wed', 3, true, '09:00', '18:00'),
  ('thu', 4, true, '09:00', '18:00'),
  ('fri', 5, true, '09:00', '18:00'),
  ('sat', 6, true, '09:00', '14:00')
on conflict (id) do nothing;

insert into public.availability_rules (id, day_of_week, start_time, end_time, active)
values
  ('tue-morning', 2, '09:00', '12:00', true),
  ('tue-afternoon', 2, '13:30', '18:00', true),
  ('wed-morning', 3, '09:00', '12:00', true),
  ('wed-afternoon', 3, '14:00', '18:00', true),
  ('thu-morning', 4, '09:00', '12:00', true),
  ('thu-afternoon', 4, '13:30', '18:00', true),
  ('fri-morning', 5, '09:00', '12:00', true),
  ('fri-afternoon', 5, '13:30', '18:00', true),
  ('sat-short', 6, '09:00', '14:00', true)
on conflict (id) do nothing;

insert into public.schedule_settings (
  id,
  slot_interval_minutes,
  buffer_between_services_minutes,
  minimum_notice_hours,
  max_days_ahead,
  allow_same_day_booking,
  allow_manual_outside_availability
) values (
  'default',
  30,
  0,
  0,
  60,
  true,
  false
)
on conflict (id) do nothing;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
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
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade,
  product_name text not null check (char_length(product_name) between 2 and 140),
  type text not null check (type in ('in', 'out', 'service_use', 'sale', 'adjustment')),
  quantity integer not null check (quantity > 0),
  notes text not null default '' check (char_length(notes) <= 1000),
  created_at timestamptz not null default now()
);

create index if not exists products_category_idx on public.products (category);
create index if not exists stock_movements_product_id_idx on public.stock_movements (product_id);

alter table public.products add column if not exists quantity integer not null default 0;
alter table public.products add column if not exists unit_cost_cents integer not null default 0;
alter table public.products add column if not exists minimum_quantity integer not null default 0;
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'products'
      and column_name = 'stock_quantity'
  ) then
    update public.products
    set quantity = coalesce(quantity, stock_quantity::integer, 0);
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'products'
      and column_name = 'cost_cents'
  ) then
    update public.products
    set unit_cost_cents = coalesce(unit_cost_cents, cost_cents, 0);
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'products'
      and column_name = 'minimum_stock'
  ) then
    update public.products
    set minimum_quantity = coalesce(minimum_quantity, minimum_stock::integer, 0);
  end if;
end $$;

alter table public.stock_movements add column if not exists product_name text not null default '';
alter table public.stock_movements add column if not exists type text not null default 'adjustment';
alter table public.stock_movements add column if not exists quantity integer not null default 0;
alter table public.stock_movements drop constraint if exists stock_movements_type_check;
alter table public.stock_movements add constraint stock_movements_type_check
  check (type in ('in', 'out', 'service_use', 'sale', 'adjustment', 'input', 'output', 'manual_adjustment'));
alter table public.stock_movements drop constraint if exists stock_movements_movement_type_check;
alter table public.stock_movements drop constraint if exists stock_movements_quantity_check;
alter table public.stock_movements add constraint stock_movements_quantity_check check (quantity >= 0);
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'stock_movements'
      and column_name = 'movement_type'
  ) then
    alter table public.stock_movements alter column movement_type set default 'adjustment';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'stock_movements'
      and column_name = 'quantity_delta'
  ) then
    alter table public.stock_movements alter column quantity_delta set default 0;
  end if;
end $$;

insert into public.products (
  name,
  category,
  quantity,
  unit_cost_cents,
  sale_price_cents,
  minimum_quantity,
  notes
)
select seed.name, seed.category, seed.quantity, seed.unit_cost_cents, seed.sale_price_cents, seed.minimum_quantity, seed.notes
from (
  values
    ('Henna castanho medio', 'Henna', 2, 1800, 0, 3, 'Repor antes do fim de semana.'),
    ('Algodao', 'Consumo', 6, 700, 0, 4, ''),
    ('Pinca dourada', 'Instrumento', 1, 3500, 0, 2, 'Separar uma reserva para atendimentos.')
) as seed(name, category, quantity, unit_cost_cents, sale_price_cents, minimum_quantity, notes)
where not exists (
  select 1 from public.products where public.products.name = seed.name
);

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

drop trigger if exists business_hours_touch_updated_at on public.business_hours;
create trigger business_hours_touch_updated_at
before update on public.business_hours
for each row execute function public.touch_updated_at();

drop trigger if exists availability_rules_touch_updated_at on public.availability_rules;
create trigger availability_rules_touch_updated_at
before update on public.availability_rules
for each row execute function public.touch_updated_at();

drop trigger if exists availability_exceptions_touch_updated_at on public.availability_exceptions;
create trigger availability_exceptions_touch_updated_at
before update on public.availability_exceptions
for each row execute function public.touch_updated_at();

drop trigger if exists schedule_settings_touch_updated_at on public.schedule_settings;
create trigger schedule_settings_touch_updated_at
before update on public.schedule_settings
for each row execute function public.touch_updated_at();

drop trigger if exists products_touch_updated_at on public.products;
create trigger products_touch_updated_at
before update on public.products
for each row execute function public.touch_updated_at();

create or replace function public.prevent_appointment_overlap()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  candidate_end time;
begin
  if new.status not in ('scheduled', 'confirmed', 'completed') then
    return new;
  end if;

  candidate_end := coalesce(new.end_time, (new.start_time + interval '60 minutes')::time);

  if candidate_end <= new.start_time then
    raise exception 'O fim do horario precisa ser depois do inicio.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.appointments existing
    where existing.scheduled_date = new.scheduled_date
      and existing.status in ('scheduled', 'confirmed', 'completed')
      and (tg_op = 'INSERT' or existing.id <> new.id)
      and new.start_time < coalesce(existing.end_time, (existing.start_time + interval '60 minutes')::time)
      and candidate_end > existing.start_time
  ) then
    raise exception 'Ja existe atendimento neste intervalo.'
      using errcode = '23P01';
  end if;

  return new;
end;
$$;

drop trigger if exists appointments_prevent_overlap on public.appointments;
create trigger appointments_prevent_overlap
before insert or update of scheduled_date, start_time, end_time, status on public.appointments
for each row execute function public.prevent_appointment_overlap();

drop function if exists public.record_stock_movement(uuid, text, integer, text);
create or replace function public.record_stock_movement(
  p_product_id uuid,
  p_type text,
  p_quantity integer,
  p_notes text default ''
)
returns table (
  product jsonb,
  movement jsonb
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_product public.products%rowtype;
  movement_row public.stock_movements%rowtype;
  normalized_type text;
  next_quantity integer;
begin
  if not app_private.is_admin() then
    raise exception 'Acesso negado.'
      using errcode = '42501';
  end if;

  normalized_type := case p_type
    when 'input' then 'in'
    when 'output' then 'out'
    when 'manual_adjustment' then 'adjustment'
    else p_type
  end;

  if normalized_type not in ('in', 'out', 'service_use', 'sale', 'adjustment') then
    raise exception 'Tipo de movimentacao invalido.'
      using errcode = '22023';
  end if;

  if p_quantity is null or p_quantity <= 0 then
    raise exception 'A quantidade precisa ser maior que zero.'
      using errcode = '22023';
  end if;

  select *
  into current_product
  from public.products
  where id = p_product_id
  for update;

  if not found then
    raise exception 'Produto nao encontrado.'
      using errcode = 'P0002';
  end if;

  next_quantity := current_product.quantity + case
    when normalized_type in ('in', 'adjustment') then p_quantity
    else -p_quantity
  end;

  if next_quantity < 0 then
    raise exception 'Estoque insuficiente para esta movimentacao.'
      using errcode = '23514';
  end if;

  update public.products
  set quantity = next_quantity,
      updated_at = now()
  where id = p_product_id
  returning * into current_product;

  insert into public.stock_movements (product_id, product_name, type, quantity, notes)
  values (p_product_id, current_product.name, normalized_type, p_quantity, coalesce(p_notes, ''))
  returning * into movement_row;

  return query select to_jsonb(current_product), to_jsonb(movement_row);
end;
$$;

drop function if exists public.record_appointment_payment(uuid, integer, text, timestamptz, text);
create or replace function public.record_appointment_payment(
  p_appointment_id uuid,
  p_amount_cents integer,
  p_method text,
  p_paid_at timestamptz,
  p_notes text default ''
)
returns table (
  appointment jsonb,
  "transaction" jsonb
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_appointment public.appointments%rowtype;
  transaction_row public.payment_transactions%rowtype;
  next_received integer;
  next_status text;
begin
  if not app_private.is_admin() then
    raise exception 'Acesso negado.'
      using errcode = '42501';
  end if;

  if p_method not in ('pix', 'cash', 'debit_card', 'credit_card', 'transfer', 'other') then
    raise exception 'Forma de pagamento invalida.'
      using errcode = '22023';
  end if;

  if p_amount_cents is null or p_amount_cents <= 0 then
    raise exception 'O valor precisa ser maior que zero.'
      using errcode = '22023';
  end if;

  select *
  into current_appointment
  from public.appointments
  where id = p_appointment_id
  for update;

  if not found then
    raise exception 'Atendimento nao encontrado.'
      using errcode = 'P0002';
  end if;

  if current_appointment.payment_status = 'canceled' then
    raise exception 'Pagamento cancelado nao pode receber novos valores.'
      using errcode = '23514';
  end if;

  next_received := current_appointment.received_amount_cents + p_amount_cents;

  if next_received > current_appointment.charged_amount_cents then
    raise exception 'O valor recebido nao pode passar do valor cobrado.'
      using errcode = '23514';
  end if;

  next_status := case
    when next_received >= current_appointment.charged_amount_cents then 'paid'
    else 'partial'
  end;

  update public.appointments
  set received_amount_cents = next_received,
      payment_method = p_method,
      payment_status = next_status,
      payment_canceled_reason = null,
      updated_at = now()
  where id = p_appointment_id
  returning * into current_appointment;

  insert into public.payment_transactions (appointment_id, amount_cents, method, paid_at, notes)
  values (p_appointment_id, p_amount_cents, p_method, coalesce(p_paid_at, now()), coalesce(p_notes, ''))
  returning * into transaction_row;

  return query select to_jsonb(current_appointment), to_jsonb(transaction_row);
end;
$$;

revoke execute on function public.prevent_appointment_overlap() from public, anon, authenticated;
revoke execute on function public.record_stock_movement(uuid, text, integer, text) from public, anon;
revoke execute on function public.record_appointment_payment(uuid, integer, text, timestamptz, text) from public, anon;
grant execute on function public.record_stock_movement(uuid, text, integer, text) to authenticated, service_role;
grant execute on function public.record_appointment_payment(uuid, integer, text, timestamptz, text) to authenticated, service_role;

grant select on public.business_profile to anon, authenticated;
grant select on public.services to anon, authenticated;
grant select on public.gallery_items to anon, authenticated;
revoke insert on public.clients from anon;
revoke insert on public.appointments from anon;
grant select, insert, update, delete on public.clients to authenticated, service_role;
grant select, insert, update, delete on public.appointments to authenticated, service_role;
grant select, insert, update, delete on public.payment_transactions to authenticated, service_role;
grant select, insert, update, delete on public.business_hours to authenticated, service_role;
grant select, insert, update, delete on public.availability_rules to authenticated, service_role;
grant select, insert, update, delete on public.availability_exceptions to authenticated, service_role;
grant select, insert, update, delete on public.schedule_settings to authenticated, service_role;
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
alter table public.payment_transactions enable row level security;
alter table public.business_hours enable row level security;
alter table public.availability_rules enable row level security;
alter table public.availability_exceptions enable row level security;
alter table public.schedule_settings enable row level security;
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

drop policy if exists "Admins can manage appointments" on public.appointments;
create policy "Admins can manage appointments"
on public.appointments
for all
to authenticated
using (app_private.is_admin())
with check (app_private.is_admin());

drop policy if exists "Visitors can request appointments" on public.appointments;

drop policy if exists "Admins can manage payment transactions" on public.payment_transactions;
create policy "Admins can manage payment transactions"
on public.payment_transactions
for all
to authenticated
using (app_private.is_admin())
with check (app_private.is_admin());

drop policy if exists "Admins can manage business hours" on public.business_hours;
create policy "Admins can manage business hours"
on public.business_hours
for all
to authenticated
using (app_private.is_admin())
with check (app_private.is_admin());

drop policy if exists "Admins can manage availability rules" on public.availability_rules;
create policy "Admins can manage availability rules"
on public.availability_rules
for all
to authenticated
using (app_private.is_admin())
with check (app_private.is_admin());

drop policy if exists "Admins can manage availability exceptions" on public.availability_exceptions;
create policy "Admins can manage availability exceptions"
on public.availability_exceptions
for all
to authenticated
using (app_private.is_admin())
with check (app_private.is_admin());

drop policy if exists "Admins can manage schedule settings" on public.schedule_settings;
create policy "Admins can manage schedule settings"
on public.schedule_settings
for all
to authenticated
using (app_private.is_admin())
with check (app_private.is_admin());

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
