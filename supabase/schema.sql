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

alter table public.admin_profiles
add column if not exists role text not null default 'admin';

alter table public.admin_profiles
drop constraint if exists admin_profiles_role_check;

alter table public.admin_profiles
add constraint admin_profiles_role_check
check (role in ('owner', 'admin'));

update public.admin_profiles
set role = 'owner'
where not exists (
  select 1
  from public.admin_profiles owner_profile
  where owner_profile.role = 'owner'
);

create or replace function app_private.is_booking_admin()
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

revoke execute on function app_private.is_booking_admin() from public, anon;
grant execute on function app_private.is_booking_admin() to authenticated;

create or replace function app_private.is_booking_owner()
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
      and role = 'owner'
  );
$$;

revoke execute on function app_private.is_booking_owner() from public, anon;
grant execute on function app_private.is_booking_owner() to authenticated;

create table if not exists public.service_catalog (
  id text primary key,
  name text not null,
  duration_minutes integer not null check (duration_minutes between 15 and 240),
  price_cents integer check (price_cents is null or price_cents >= 0),
  description text not null,
  image_path text,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.service_catalog
add column if not exists image_path text;

alter table public.service_catalog
drop constraint if exists service_catalog_image_path_length_check;

alter table public.service_catalog
add constraint service_catalog_image_path_length_check
check (image_path is null or char_length(image_path) <= 500);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'service-images',
  'service-images',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

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
  service_id text not null references public.service_catalog(id) on update cascade,
  service_name text not null,
  preferred_date date not null,
  preferred_time time not null,
  preferred_end_time time,
  notes text check (notes is null or char_length(notes) <= 1200),
  status text not null default 'pending',
  source text not null default 'site',
  canceled_at timestamptz,
  canceled_by uuid references auth.users(id) on delete set null,
  cancellation_reason text check (cancellation_reason is null or char_length(cancellation_reason) <= 500),
  confirmed_at timestamptz,
  completed_at timestamptz,
  no_show_at timestamptz
);

alter table public.bookings
drop constraint if exists bookings_status_check;

update public.bookings
set status = case
  when status = 'done' then 'completed'
  when status = 'cancelled' then 'canceled_by_admin'
  else status
end
where status in ('done', 'cancelled');

alter table public.bookings
add constraint bookings_status_check
check (status in ('awaiting_deposit', 'pending', 'confirmed', 'completed', 'canceled_by_client', 'canceled_by_admin', 'deposit_expired', 'no_show'));

alter table public.bookings
add column if not exists preferred_end_time time;

alter table public.bookings
add column if not exists canceled_at timestamptz;

alter table public.bookings
add column if not exists canceled_by uuid references auth.users(id) on delete set null;

alter table public.bookings
add column if not exists cancellation_reason text check (cancellation_reason is null or char_length(cancellation_reason) <= 500);

alter table public.bookings
add column if not exists confirmed_at timestamptz;

alter table public.bookings
add column if not exists completed_at timestamptz;

alter table public.bookings
add column if not exists no_show_at timestamptz;

alter table public.bookings
alter column service_id set not null;

update public.bookings
set preferred_end_time = preferred_time + interval '40 minutes'
where preferred_end_time is null;

alter table public.bookings
alter column preferred_end_time set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'bookings_preferred_time_range_check'
      and conrelid = 'public.bookings'::regclass
  ) then
    alter table public.bookings
    add constraint bookings_preferred_time_range_check
    check (preferred_end_time > preferred_time);
  end if;
end;
$$;

create table if not exists public.admin_unavailable_days (
  id uuid primary key default gen_random_uuid(),
  unavailable_date date not null unique,
  reason text check (reason is null or char_length(reason) <= 240),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_availability_slots (
  id uuid primary key default gen_random_uuid(),
  weekday smallint not null check (weekday between 1 and 7),
  start_time time not null,
  end_time time not null,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_availability_slots_time_range_check check (end_time > start_time),
  constraint admin_availability_slots_unique_period unique (weekday, start_time, end_time)
);

create table if not exists public.booking_policies (
  id text primary key default 'default',
  cancellation_cutoff_hours integer not null default 12 check (cancellation_cutoff_hours between 0 and 168),
  reschedule_cutoff_hours integer not null default 12 check (reschedule_cutoff_hours between 0 and 168),
  no_show_grace_minutes integer not null default 15 check (no_show_grace_minutes between 0 and 180),
  auto_confirm_enabled boolean not null default false,
  deposit_required boolean not null default false,
  deposit_amount_cents integer not null default 0 check (deposit_amount_cents between 0 and 100000),
  deposit_checkout_expiration_minutes integer not null default 30 check (deposit_checkout_expiration_minutes between 10 and 1440),
  policy_text text not null check (char_length(policy_text) between 20 and 2000),
  active boolean not null default true,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.booking_policies
add column if not exists deposit_required boolean not null default false;

alter table public.booking_policies
add column if not exists deposit_amount_cents integer not null default 0;

alter table public.booking_policies
add column if not exists deposit_checkout_expiration_minutes integer not null default 30;

alter table public.booking_policies
drop constraint if exists booking_policies_deposit_amount_cents_check;

alter table public.booking_policies
add constraint booking_policies_deposit_amount_cents_check
check (deposit_amount_cents between 0 and 100000);

alter table public.booking_policies
drop constraint if exists booking_policies_deposit_checkout_expiration_minutes_check;

alter table public.booking_policies
add constraint booking_policies_deposit_checkout_expiration_minutes_check
check (deposit_checkout_expiration_minutes between 10 and 1440);

alter table public.booking_policies
drop constraint if exists booking_policies_deposit_required_amount_check;

alter table public.booking_policies
add constraint booking_policies_deposit_required_amount_check
check (not deposit_required or deposit_amount_cents > 0);

insert into public.booking_policies (id, policy_text)
values (
  'default',
  'Cancelamentos e remarcacoes devem ser solicitados com antecedencia. Atrasos podem reduzir o tempo de atendimento ou exigir novo agendamento. A confirmacao final pode ser enviada por WhatsApp ou email.'
)
on conflict (id) do nothing;

create table if not exists public.booking_status_events (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  from_status text,
  to_status text not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_role text not null default 'system' check (actor_role in ('client', 'admin', 'system')),
  reason text check (reason is null or char_length(reason) <= 500),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.booking_internal_notes (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  admin_user_id uuid references auth.users(id) on delete set null,
  note text not null check (char_length(note) between 2 and 1200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.booking_notification_queue (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  type text not null check (type in ('confirmation', 'reminder', 'cancellation', 'follow_up')),
  channel text not null default 'manual_whatsapp' check (channel in ('manual_whatsapp', 'manual_email', 'in_app')),
  status text not null default 'pending' check (status in ('pending', 'done', 'skipped')),
  scheduled_for timestamptz not null default now(),
  message_template text not null check (char_length(message_template) between 2 and 1200),
  done_by uuid references auth.users(id) on delete set null,
  done_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.booking_payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'asaas' check (provider in ('asaas')),
  provider_checkout_id text unique,
  provider_payment_id text,
  status text not null default 'pending' check (status in ('pending', 'paid', 'expired', 'canceled', 'failed')),
  amount_cents integer not null check (amount_cents > 0),
  checkout_url text,
  expires_at timestamptz not null,
  paid_at timestamptz,
  raw_event jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.asaas_webhook_events (
  id uuid primary key default gen_random_uuid(),
  asaas_event_id text not null unique,
  event_type text not null,
  payload jsonb not null,
  processing_error text,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.asaas_webhook_events
add column if not exists processing_error text;

with weekdays as (
  select generate_series(1, 5) as weekday
), default_slots(start_time, end_time, sort_order) as (
  values
    ('08:00'::time, '08:40'::time, 10),
    ('08:40'::time, '09:20'::time, 20),
    ('09:20'::time, '10:00'::time, 30),
    ('10:00'::time, '10:40'::time, 40),
    ('10:40'::time, '11:20'::time, 50),
    ('11:20'::time, '12:00'::time, 60),
    ('14:00'::time, '14:40'::time, 70),
    ('14:40'::time, '15:20'::time, 80),
    ('15:20'::time, '16:00'::time, 90),
    ('16:00'::time, '16:40'::time, 100),
    ('16:40'::time, '17:20'::time, 110),
    ('17:20'::time, '18:00'::time, 120)
)
insert into public.admin_availability_slots (weekday, start_time, end_time, sort_order)
select weekdays.weekday, default_slots.start_time, default_slots.end_time, default_slots.sort_order
from weekdays
cross join default_slots
on conflict (weekday, start_time, end_time) do nothing;

create index if not exists bookings_user_id_idx on public.bookings (user_id);
create index if not exists bookings_service_id_idx on public.bookings (service_id);
create index if not exists bookings_date_status_idx on public.bookings (preferred_date, status);
create index if not exists bookings_canceled_by_idx on public.bookings (canceled_by);
drop index if exists public.bookings_unique_active_slot_idx;
create unique index bookings_unique_active_slot_idx
on public.bookings (preferred_date, preferred_time)
where status in ('awaiting_deposit', 'pending', 'confirmed');
create index if not exists service_catalog_active_sort_idx on public.service_catalog (active, sort_order);
create index if not exists admin_unavailable_days_date_idx on public.admin_unavailable_days (unavailable_date);
create index if not exists admin_unavailable_days_created_by_idx on public.admin_unavailable_days (created_by);
create index if not exists admin_availability_slots_weekday_active_idx
on public.admin_availability_slots (weekday, active, start_time);
create index if not exists admin_availability_slots_created_by_idx on public.admin_availability_slots (created_by);
create index if not exists booking_status_events_booking_created_idx
on public.booking_status_events (booking_id, created_at desc);
create index if not exists booking_status_events_actor_user_id_idx
on public.booking_status_events (actor_user_id);
create index if not exists booking_internal_notes_booking_created_idx
on public.booking_internal_notes (booking_id, created_at desc);
create index if not exists booking_internal_notes_admin_user_id_idx
on public.booking_internal_notes (admin_user_id);
create index if not exists booking_notification_queue_status_scheduled_idx
on public.booking_notification_queue (status, scheduled_for);
create index if not exists booking_notification_queue_booking_idx
on public.booking_notification_queue (booking_id);
create index if not exists booking_notification_queue_done_by_idx
on public.booking_notification_queue (done_by);
create index if not exists booking_policies_updated_by_idx
on public.booking_policies (updated_by);
create index if not exists booking_payments_booking_created_idx
on public.booking_payments (booking_id, created_at desc);
create index if not exists booking_payments_user_status_idx
on public.booking_payments (user_id, status);
create index if not exists booking_payments_provider_payment_id_idx
on public.booking_payments (provider_payment_id);

update public.booking_payments
set status = 'expired',
    updated_at = now()
where status = 'pending'
  and expires_at <= now();

with ranked_pending_payments as (
  select
    id,
    row_number() over (
      partition by booking_id, provider
      order by created_at desc, id desc
    ) as payment_rank
  from public.booking_payments
  where status = 'pending'
)
update public.booking_payments payment
set status = 'failed',
    updated_at = now()
from ranked_pending_payments ranked
where payment.id = ranked.id
  and ranked.payment_rank > 1;

create unique index if not exists booking_payments_one_pending_per_booking_provider_idx
on public.booking_payments (booking_id, provider)
where status = 'pending';
create index if not exists asaas_webhook_events_type_created_idx
on public.asaas_webhook_events (event_type, created_at desc);

create or replace function public.ensure_availability_slot_valid()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.end_time <= new.start_time then
    raise exception 'availability_slot_invalid';
  end if;

  if new.active and exists (
    select 1
    from public.admin_availability_slots existing_slot
    where existing_slot.weekday = new.weekday
      and existing_slot.active
      and existing_slot.id <> new.id
      and existing_slot.start_time < new.end_time
      and existing_slot.end_time > new.start_time
  ) then
    raise exception 'availability_slot_overlap';
  end if;

  return new;
end;
$$;

revoke execute on function public.ensure_availability_slot_valid() from public, anon, authenticated;

drop trigger if exists admin_availability_slots_ensure_valid on public.admin_availability_slots;
create trigger admin_availability_slots_ensure_valid
before insert or update of weekday, start_time, end_time, active
on public.admin_availability_slots
for each row
execute function public.ensure_availability_slot_valid();

create or replace function public.ensure_booking_date_available()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.status in ('awaiting_deposit', 'pending', 'confirmed') then
    if tg_op = 'UPDATE'
      and old.status in ('awaiting_deposit', 'pending', 'confirmed')
      and new.preferred_date is not distinct from old.preferred_date
      and new.preferred_time is not distinct from old.preferred_time
      and new.preferred_end_time is not distinct from old.preferred_end_time then
      return new;
    end if;

    if new.preferred_date < (now() at time zone 'America/Sao_Paulo')::date then
      raise exception 'booking_date_in_past';
    end if;

    if (new.preferred_date + new.preferred_time) <= (now() at time zone 'America/Sao_Paulo') then
      raise exception 'booking_slot_in_past';
    end if;

    if exists (
      select 1
      from public.admin_unavailable_days unavailable_day
      where unavailable_day.unavailable_date = new.preferred_date
    ) then
      raise exception 'booking_date_unavailable';
    end if;

    if not exists (
      select 1
      from public.admin_availability_slots availability_slot
      where availability_slot.weekday = extract(isodow from new.preferred_date)::smallint
        and availability_slot.start_time = new.preferred_time
        and availability_slot.end_time = new.preferred_end_time
        and availability_slot.active
    ) then
      raise exception 'booking_slot_unavailable';
    end if;
  end if;

  return new;
end;
$$;

revoke execute on function public.ensure_booking_date_available() from public, anon, authenticated;

drop trigger if exists bookings_ensure_date_available on public.bookings;
create trigger bookings_ensure_date_available
before insert or update of preferred_date, preferred_time, preferred_end_time, status
on public.bookings
for each row
execute function public.ensure_booking_date_available();

drop function if exists public.get_booked_slots(date);

create or replace function app_private.get_booked_slots(slot_date date)
returns table (preferred_time time, preferred_end_time time)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select b.preferred_time, b.preferred_end_time
  from public.bookings b
  where b.preferred_date = slot_date
    and b.status in ('awaiting_deposit', 'pending', 'confirmed')
  order by b.preferred_time;
$$;

revoke execute on function app_private.get_booked_slots(date) from public, anon;
grant execute on function app_private.get_booked_slots(date) to authenticated;

create or replace function public.get_booked_slots(slot_date date)
returns table (preferred_time time, preferred_end_time time)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select *
  from app_private.get_booked_slots(slot_date);
$$;

revoke execute on function public.get_booked_slots(date) from public, anon;
grant execute on function public.get_booked_slots(date) to authenticated;

create or replace function public.get_active_booking_policy()
returns public.booking_policies
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select *
  from public.booking_policies
  where active
  order by updated_at desc
  limit 1;
$$;

revoke execute on function public.get_active_booking_policy() from public;
grant execute on function public.get_active_booking_policy() to anon, authenticated;

create or replace function public.ensure_booking_status_transition()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    if old.status in ('completed', 'canceled_by_client', 'canceled_by_admin', 'deposit_expired', 'no_show') then
      raise exception 'booking_status_final';
    end if;

    if old.status = 'awaiting_deposit' and new.status not in ('pending', 'confirmed', 'canceled_by_client', 'canceled_by_admin', 'deposit_expired') then
      raise exception 'booking_status_transition_invalid';
    end if;

    if old.status = 'pending' and new.status not in ('confirmed', 'canceled_by_client', 'canceled_by_admin') then
      raise exception 'booking_status_transition_invalid';
    end if;

    if old.status = 'confirmed' and new.status not in ('pending', 'completed', 'canceled_by_client', 'canceled_by_admin', 'no_show') then
      raise exception 'booking_status_transition_invalid';
    end if;
  end if;

  return new;
end;
$$;

revoke execute on function public.ensure_booking_status_transition() from public, anon, authenticated;

drop trigger if exists bookings_ensure_status_transition on public.bookings;
create trigger bookings_ensure_status_transition
before update of status
on public.bookings
for each row
execute function public.ensure_booking_status_transition();

create or replace function public.record_booking_status_event()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor_role_value text := 'system';
begin
  if (tg_op = 'INSERT') or (new.status is distinct from old.status) then
    if auth.uid() is not null then
      actor_role_value := case when app_private.is_booking_admin() then 'admin' else 'client' end;
    end if;

    insert into public.booking_status_events (
      booking_id,
      from_status,
      to_status,
      actor_user_id,
      actor_role,
      reason
    ) values (
      new.id,
      case when tg_op = 'INSERT' then null else old.status end,
      new.status,
      auth.uid(),
      actor_role_value,
      case when tg_op = 'INSERT' then 'Agendamento criado' else 'Status atualizado' end
    );
  end if;

  return new;
end;
$$;

revoke execute on function public.record_booking_status_event() from public, anon, authenticated;

drop trigger if exists bookings_record_status_event on public.bookings;
create trigger bookings_record_status_event
after insert or update of status
on public.bookings
for each row
execute function public.record_booking_status_event();

create or replace function public.queue_initial_booking_notifications()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  appointment_at timestamptz;
begin
  if tg_op = 'INSERT' and new.status = 'awaiting_deposit' then
    return new;
  end if;

  if tg_op = 'UPDATE' and not (
    old.status = 'awaiting_deposit'
    and new.status in ('pending', 'confirmed')
  ) then
    return new;
  end if;

  appointment_at := ((new.preferred_date + new.preferred_time) at time zone 'America/Sao_Paulo');

  insert into public.booking_notification_queue (booking_id, type, scheduled_for, message_template)
  values (
    new.id,
    'confirmation',
    now(),
    case
      when new.status = 'confirmed' then
        'Ola ' || new.client_name || ', seu horario para ' || new.service_name || ' em ' || to_char(new.preferred_date, 'DD/MM/YYYY') || ' das ' || to_char(new.preferred_time, 'HH24:MI') || ' as ' || to_char(new.preferred_end_time, 'HH24:MI') || ' esta confirmado.'
      else
        'Ola ' || new.client_name || ', seu horario para ' || new.service_name || ' em ' || to_char(new.preferred_date, 'DD/MM/YYYY') || ' das ' || to_char(new.preferred_time, 'HH24:MI') || ' as ' || to_char(new.preferred_end_time, 'HH24:MI') || ' foi registrado. A Hellen vai confirmar por aqui.'
    end
  );

  insert into public.booking_notification_queue (booking_id, type, scheduled_for, message_template)
  values (
    new.id,
    'reminder',
    greatest(now(), appointment_at - interval '24 hours'),
    'Lembrete: seu atendimento com Hellen Martins Brows e amanha/hoje, ' || to_char(new.preferred_date, 'DD/MM/YYYY') || ', das ' || to_char(new.preferred_time, 'HH24:MI') || ' as ' || to_char(new.preferred_end_time, 'HH24:MI') || '.'
  );

  return new;
end;
$$;

revoke execute on function public.queue_initial_booking_notifications() from public, anon, authenticated;

drop trigger if exists bookings_queue_initial_notifications on public.bookings;
create trigger bookings_queue_initial_notifications
after insert or update of status
on public.bookings
for each row
execute function public.queue_initial_booking_notifications();

create or replace function app_private.ensure_admin_owner_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'DELETE' and old.role = 'owner' then
    if (select count(*) from public.admin_profiles where role = 'owner') <= 1 then
      raise exception 'admin_owner_required';
    end if;
  end if;

  if tg_op = 'UPDATE' and old.role = 'owner' and new.role <> 'owner' then
    if (select count(*) from public.admin_profiles where role = 'owner') <= 1 then
      raise exception 'admin_owner_required';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

revoke execute on function app_private.ensure_admin_owner_guard() from public, anon, authenticated;

drop trigger if exists admin_profiles_owner_guard on public.admin_profiles;
create trigger admin_profiles_owner_guard
before update of role or delete
on public.admin_profiles
for each row
execute function app_private.ensure_admin_owner_guard();

create or replace function app_private.ensure_booking_payment_owner()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  booking_owner uuid;
begin
  select user_id into booking_owner
  from public.bookings
  where id = new.booking_id;

  if booking_owner is null then
    raise exception 'booking_payment_booking_not_found';
  end if;

  if new.user_id is distinct from booking_owner then
    raise exception 'booking_payment_owner_mismatch';
  end if;

  return new;
end;
$$;

revoke execute on function app_private.ensure_booking_payment_owner() from public, anon, authenticated;

drop trigger if exists booking_payments_ensure_owner on public.booking_payments;
create trigger booking_payments_ensure_owner
before insert or update of booking_id, user_id
on public.booking_payments
for each row
execute function app_private.ensure_booking_payment_owner();

create or replace function app_private.expire_overdue_deposits()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  expired_count integer;
begin
  with expired_payments as (
    update public.booking_payments payment
    set status = 'expired',
        updated_at = now()
    where payment.status = 'pending'
      and payment.expires_at <= now()
    returning payment.booking_id
  ), expired_bookings as (
    update public.bookings booking
    set status = 'deposit_expired',
        canceled_at = now(),
        cancellation_reason = 'Sinal nao pago no prazo.',
        updated_at = now()
    where booking.status = 'awaiting_deposit'
      and booking.id in (select booking_id from expired_payments)
    returning booking.id
  )
  select count(*) into expired_count
  from expired_bookings;

  return expired_count;
end;
$$;

revoke execute on function app_private.expire_overdue_deposits() from public, anon;
grant execute on function app_private.expire_overdue_deposits() to authenticated;

create or replace function public.expire_overdue_deposits()
returns integer
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if not app_private.is_booking_admin() then
    raise exception 'booking_admin_required';
  end if;

  return app_private.expire_overdue_deposits();
end;
$$;

revoke execute on function public.expire_overdue_deposits() from public, anon;
grant execute on function public.expire_overdue_deposits() to authenticated;

create or replace function app_private.prepare_booking_insert()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  selected_service_name text;
  is_admin boolean;
  active_policy public.booking_policies;
  account_email text;
begin
  is_admin := app_private.is_booking_admin();
  account_email := lower(coalesce(auth.jwt() ->> 'email', ''));

  if auth.uid() is null then
    raise exception 'booking_auth_required';
  end if;

  perform app_private.expire_overdue_deposits();

  if not is_admin then
    if new.user_id is distinct from auth.uid() then
      raise exception 'booking_user_mismatch';
    end if;

    if account_email = '' then
      raise exception 'booking_email_required';
    end if;

    new.client_email := account_email;
    select * into active_policy from public.get_active_booking_policy();
    new.status := case
      when active_policy.deposit_required and active_policy.deposit_amount_cents > 0 then 'awaiting_deposit'
      when active_policy.auto_confirm_enabled then 'confirmed'
      else 'pending'
    end;
  else
    new.client_email := lower(trim(new.client_email));
  end if;

  select service.name into selected_service_name
  from public.service_catalog service
  where service.id = new.service_id
    and (service.active or is_admin);

  if not found then
    raise exception 'booking_service_unavailable';
  end if;

  new.service_name := selected_service_name;
  new.source := coalesce(nullif(trim(new.source), ''), 'site');
  new.updated_at := now();

  return new;
end;
$$;

revoke execute on function app_private.prepare_booking_insert() from public, anon, authenticated;

drop trigger if exists bookings_prepare_insert on public.bookings;
drop trigger if exists bookings_010_prepare_insert on public.bookings;
create trigger bookings_010_prepare_insert
before insert
on public.bookings
for each row
execute function app_private.prepare_booking_insert();

create or replace function app_private.client_cancel_booking(booking_id uuid, reason text default null)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_booking public.bookings;
  policy public.booking_policies;
  appointment_at timestamp;
begin
  if auth.uid() is null then
    raise exception 'booking_auth_required';
  end if;

  select * into target_booking
  from public.bookings
  where id = booking_id
  for update;

  if not found or target_booking.user_id <> auth.uid() then
    raise exception 'booking_not_found';
  end if;

  if target_booking.status not in ('awaiting_deposit', 'pending', 'confirmed') then
    raise exception 'booking_status_final';
  end if;

  select * into policy from public.get_active_booking_policy();
  appointment_at := target_booking.preferred_date + target_booking.preferred_time;

  if target_booking.status <> 'awaiting_deposit'
    and appointment_at - (now() at time zone 'America/Sao_Paulo') < make_interval(hours => policy.cancellation_cutoff_hours) then
    raise exception 'booking_policy_cutoff';
  end if;

  update public.bookings
  set status = 'canceled_by_client',
      canceled_at = now(),
      canceled_by = auth.uid(),
      cancellation_reason = nullif(trim(reason), ''),
      updated_at = now()
  where id = booking_id;

  insert into public.booking_notification_queue (booking_id, type, scheduled_for, message_template)
  values (
    booking_id,
    'cancellation',
    now(),
    'Ola ' || target_booking.client_name || ', seu horario em ' || to_char(target_booking.preferred_date, 'DD/MM/YYYY') || ' foi cancelado. Se quiser remarcar, acesse a area da cliente.'
  );
end;
$$;

revoke execute on function app_private.client_cancel_booking(uuid, text) from public, anon;
grant execute on function app_private.client_cancel_booking(uuid, text) to authenticated;

create or replace function public.client_cancel_booking(booking_id uuid, reason text default null)
returns void
language sql
security invoker
set search_path = public, pg_temp
as $$
  select app_private.client_cancel_booking(booking_id, reason);
$$;

revoke execute on function public.client_cancel_booking(uuid, text) from public, anon;
grant execute on function public.client_cancel_booking(uuid, text) to authenticated;

create or replace function app_private.client_reschedule_booking(
  booking_id uuid,
  new_date date,
  new_start_time time,
  new_end_time time,
  reason text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_booking public.bookings;
  policy public.booking_policies;
  appointment_at timestamp;
  next_status text;
begin
  if auth.uid() is null then
    raise exception 'booking_auth_required';
  end if;

  if new_date is null or new_start_time is null or new_end_time is null or new_end_time <= new_start_time then
    raise exception 'booking_slot_unavailable';
  end if;

  select * into target_booking
  from public.bookings
  where id = booking_id
  for update;

  if not found or target_booking.user_id <> auth.uid() then
    raise exception 'booking_not_found';
  end if;

  if target_booking.status not in ('pending', 'confirmed') then
    raise exception 'booking_status_final';
  end if;

  select * into policy from public.get_active_booking_policy();
  appointment_at := target_booking.preferred_date + target_booking.preferred_time;

  if appointment_at - (now() at time zone 'America/Sao_Paulo') < make_interval(hours => policy.reschedule_cutoff_hours) then
    raise exception 'booking_policy_cutoff';
  end if;

  next_status := case when policy.auto_confirm_enabled then 'confirmed' else 'pending' end;

  update public.bookings
  set preferred_date = new_date,
      preferred_time = new_start_time,
      preferred_end_time = new_end_time,
      status = next_status,
      updated_at = now()
  where id = booking_id;

  insert into public.booking_status_events (
    booking_id,
    from_status,
    to_status,
    actor_user_id,
    actor_role,
    reason,
    metadata
  ) values (
    booking_id,
    target_booking.status,
    target_booking.status,
    auth.uid(),
    'client',
    coalesce(nullif(trim(reason), ''), 'Remarcacao solicitada pela cliente'),
    jsonb_build_object(
      'from_date', target_booking.preferred_date,
      'from_time', target_booking.preferred_time,
      'to_date', new_date,
      'to_time', new_start_time
    )
  );

  insert into public.booking_notification_queue (booking_id, type, scheduled_for, message_template)
  values (
    booking_id,
    'confirmation',
    now(),
    'Ola ' || target_booking.client_name || ', sua remarcacao para ' || to_char(new_date, 'DD/MM/YYYY') || ' das ' || to_char(new_start_time, 'HH24:MI') || ' as ' || to_char(new_end_time, 'HH24:MI') || ' foi registrada. A Hellen vai confirmar por aqui.'
  );
end;
$$;

revoke execute on function app_private.client_reschedule_booking(uuid, date, time, time, text) from public, anon;
grant execute on function app_private.client_reschedule_booking(uuid, date, time, time, text) to authenticated;

create or replace function public.client_reschedule_booking(
  booking_id uuid,
  new_date date,
  new_start_time time,
  new_end_time time,
  reason text default null
)
returns void
language sql
security invoker
set search_path = public, pg_temp
as $$
  select app_private.client_reschedule_booking(booking_id, new_date, new_start_time, new_end_time, reason);
$$;

revoke execute on function public.client_reschedule_booking(uuid, date, time, time, text) from public, anon;
grant execute on function public.client_reschedule_booking(uuid, date, time, time, text) to authenticated;

alter table public.admin_profiles enable row level security;
alter table public.service_catalog enable row level security;
alter table public.bookings enable row level security;
alter table public.admin_unavailable_days enable row level security;
alter table public.admin_availability_slots enable row level security;
alter table public.booking_policies enable row level security;
alter table public.booking_status_events enable row level security;
alter table public.booking_internal_notes enable row level security;
alter table public.booking_notification_queue enable row level security;
alter table public.booking_payments enable row level security;
alter table public.asaas_webhook_events enable row level security;

drop policy if exists "Admins and owners can read admin profiles" on public.admin_profiles;
create policy "Admins and owners can read admin profiles"
on public.admin_profiles
for select
to authenticated
using (user_id = (select auth.uid()) or (select app_private.is_booking_admin()));

drop policy if exists "Only admins can write admin profiles" on public.admin_profiles;
drop policy if exists "Admins can insert admin profiles" on public.admin_profiles;
create policy "Admins can insert admin profiles"
on public.admin_profiles
for insert
to authenticated
with check ((select app_private.is_booking_owner()));

drop policy if exists "Admins can update admin profiles" on public.admin_profiles;
create policy "Admins can update admin profiles"
on public.admin_profiles
for update
to authenticated
using ((select app_private.is_booking_owner()))
with check ((select app_private.is_booking_owner()));

drop policy if exists "Admins can delete admin profiles" on public.admin_profiles;
create policy "Admins can delete admin profiles"
on public.admin_profiles
for delete
to authenticated
using ((select app_private.is_booking_owner()));

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
using (active = true or (select app_private.is_booking_admin()));

drop policy if exists "Admins can manage services" on public.service_catalog;
drop policy if exists "Admins can insert services" on public.service_catalog;
create policy "Admins can insert services"
on public.service_catalog
for insert
to authenticated
with check ((select app_private.is_booking_admin()));

drop policy if exists "Admins can update services" on public.service_catalog;
create policy "Admins can update services"
on public.service_catalog
for update
to authenticated
using ((select app_private.is_booking_admin()))
with check ((select app_private.is_booking_admin()));

drop policy if exists "Admins can delete services" on public.service_catalog;
create policy "Admins can delete services"
on public.service_catalog
for delete
to authenticated
using ((select app_private.is_booking_admin()));

drop policy if exists "Admins can upload service images" on storage.objects;
create policy "Admins can upload service images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'service-images'
  and (select app_private.is_booking_admin())
  and lower(coalesce(storage.extension(name), '')) in ('jpg', 'jpeg', 'png', 'webp', 'avif')
);

drop policy if exists "Admins can update service images" on storage.objects;
create policy "Admins can update service images"
on storage.objects
for update
to authenticated
using (bucket_id = 'service-images' and (select app_private.is_booking_admin()))
with check (
  bucket_id = 'service-images'
  and (select app_private.is_booking_admin())
  and lower(coalesce(storage.extension(name), '')) in ('jpg', 'jpeg', 'png', 'webp', 'avif')
);

drop policy if exists "Admins can delete service images" on storage.objects;
create policy "Admins can delete service images"
on storage.objects
for delete
to authenticated
using (bucket_id = 'service-images' and (select app_private.is_booking_admin()));

drop policy if exists "Anyone can request a booking" on public.bookings;
drop policy if exists "Authenticated users can request a booking" on public.bookings;
create policy "Authenticated users can request a booking"
on public.bookings
for insert
to authenticated
with check (
  (select app_private.is_booking_admin())
  or (
    user_id = (select auth.uid())
    and status in ('awaiting_deposit', 'pending', 'confirmed')
  )
);

drop policy if exists "Users and admins can read bookings" on public.bookings;
create policy "Users and admins can read bookings"
on public.bookings
for select
to authenticated
using (user_id = (select auth.uid()) or (select app_private.is_booking_admin()));

drop policy if exists "Users and admins can read booking payments" on public.booking_payments;
create policy "Users and admins can read booking payments"
on public.booking_payments
for select
to authenticated
using (
  (select app_private.is_booking_admin())
  or exists (
    select 1
    from public.bookings b
    where b.id = booking_payments.booking_id
      and b.user_id = (select auth.uid())
  )
);

drop policy if exists "Admins can read Asaas webhook events" on public.asaas_webhook_events;
create policy "Admins can read Asaas webhook events"
on public.asaas_webhook_events
for select
to authenticated
using ((select app_private.is_booking_admin()));

drop policy if exists "Admins can update bookings" on public.bookings;
create policy "Admins can update bookings"
on public.bookings
for update
to authenticated
using ((select app_private.is_booking_admin()))
with check ((select app_private.is_booking_admin()));

drop policy if exists "Admins can delete bookings" on public.bookings;
create policy "Admins can delete bookings"
on public.bookings
for delete
to authenticated
using ((select app_private.is_booking_admin()));

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
with check ((select app_private.is_booking_admin()));

drop policy if exists "Admins can update unavailable days" on public.admin_unavailable_days;
create policy "Admins can update unavailable days"
on public.admin_unavailable_days
for update
to authenticated
using ((select app_private.is_booking_admin()))
with check ((select app_private.is_booking_admin()));

drop policy if exists "Admins can delete unavailable days" on public.admin_unavailable_days;
create policy "Admins can delete unavailable days"
on public.admin_unavailable_days
for delete
to authenticated
using ((select app_private.is_booking_admin()));

drop policy if exists "Users can read availability slots" on public.admin_availability_slots;
create policy "Users can read availability slots"
on public.admin_availability_slots
for select
to authenticated
using (active = true or (select app_private.is_booking_admin()));

drop policy if exists "Admins can insert availability slots" on public.admin_availability_slots;
create policy "Admins can insert availability slots"
on public.admin_availability_slots
for insert
to authenticated
with check ((select app_private.is_booking_admin()));

drop policy if exists "Admins can update availability slots" on public.admin_availability_slots;
create policy "Admins can update availability slots"
on public.admin_availability_slots
for update
to authenticated
using ((select app_private.is_booking_admin()))
with check ((select app_private.is_booking_admin()));

drop policy if exists "Admins can delete availability slots" on public.admin_availability_slots;
create policy "Admins can delete availability slots"
on public.admin_availability_slots
for delete
to authenticated
using ((select app_private.is_booking_admin()));

drop policy if exists "Anyone can read active booking policy" on public.booking_policies;
create policy "Anyone can read active booking policy"
on public.booking_policies
for select
to anon
using (active = true);

drop policy if exists "Users can read active booking policy" on public.booking_policies;
create policy "Users can read active booking policy"
on public.booking_policies
for select
to authenticated
using (active = true or (select app_private.is_booking_admin()));

drop policy if exists "Admins can insert booking policies" on public.booking_policies;
create policy "Admins can insert booking policies"
on public.booking_policies
for insert
to authenticated
with check ((select app_private.is_booking_admin()));

drop policy if exists "Admins can update booking policies" on public.booking_policies;
create policy "Admins can update booking policies"
on public.booking_policies
for update
to authenticated
using ((select app_private.is_booking_admin()))
with check ((select app_private.is_booking_admin()));

drop policy if exists "Users and admins can read booking status events" on public.booking_status_events;
create policy "Users and admins can read booking status events"
on public.booking_status_events
for select
to authenticated
using (
  (select app_private.is_booking_admin())
  or exists (
    select 1
    from public.bookings b
    where b.id = booking_status_events.booking_id
      and b.user_id = (select auth.uid())
  )
);

drop policy if exists "Admins can read internal notes" on public.booking_internal_notes;
create policy "Admins can read internal notes"
on public.booking_internal_notes
for select
to authenticated
using ((select app_private.is_booking_admin()));

drop policy if exists "Admins can insert internal notes" on public.booking_internal_notes;
create policy "Admins can insert internal notes"
on public.booking_internal_notes
for insert
to authenticated
with check ((select app_private.is_booking_admin()));

drop policy if exists "Admins can update internal notes" on public.booking_internal_notes;
create policy "Admins can update internal notes"
on public.booking_internal_notes
for update
to authenticated
using ((select app_private.is_booking_admin()))
with check ((select app_private.is_booking_admin()));

drop policy if exists "Admins can delete internal notes" on public.booking_internal_notes;
create policy "Admins can delete internal notes"
on public.booking_internal_notes
for delete
to authenticated
using ((select app_private.is_booking_admin()));

drop policy if exists "Admins can read notification queue" on public.booking_notification_queue;
create policy "Admins can read notification queue"
on public.booking_notification_queue
for select
to authenticated
using ((select app_private.is_booking_admin()));

drop policy if exists "Admins can insert notification queue" on public.booking_notification_queue;
create policy "Admins can insert notification queue"
on public.booking_notification_queue
for insert
to authenticated
with check ((select app_private.is_booking_admin()));

drop policy if exists "Admins can update notification queue" on public.booking_notification_queue;
create policy "Admins can update notification queue"
on public.booking_notification_queue
for update
to authenticated
using ((select app_private.is_booking_admin()))
with check ((select app_private.is_booking_admin()));

drop policy if exists "Admins can delete notification queue" on public.booking_notification_queue;
create policy "Admins can delete notification queue"
on public.booking_notification_queue
for delete
to authenticated
using ((select app_private.is_booking_admin()));

drop function if exists public.is_booking_admin();

alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

commit;
