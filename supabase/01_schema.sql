-- RentFlow · schéma métier v1 pour Supabase/PostgreSQL
-- À exécuter une fois dans le SQL Editor d'un projet Supabase neuf.
-- Ce fichier ne crée pas les utilisateurs ni les sessions Supabase Auth.

create extension if not exists pgcrypto with schema extensions;

do $$ begin
  create type public.account_kind as enum ('owner', 'agent');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.rent_status as enum ('upcoming', 'due', 'awaiting_confirmation', 'paid', 'overdue', 'cancelled');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.payment_method as enum ('orange_money', 'mtn_momo', 'cash', 'bank_transfer');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.payment_status as enum ('pending', 'confirmed', 'rejected', 'cancelled');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.subscription_status as enum ('trial', 'active', 'read_only', 'cancelled', 'expired');
exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  account_kind public.account_kind not null default 'owner',
  full_name text not null default '',
  phone text,
  email text,
  orange_money_phone text,
  mtn_momo_phone text,
  timezone text not null default 'Africa/Douala',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_name_length check (char_length(full_name) <= 160)
);

create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  neighborhood text not null default '',
  city text not null,
  notes text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, owner_id),
  constraint properties_name_length check (char_length(name) between 1 and 160),
  constraint properties_city_length check (char_length(city) between 1 and 100)
);

create table if not exists public.units (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  property_id uuid not null,
  name text not null,
  notes text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, owner_id),
  foreign key (property_id, owner_id) references public.properties(id, owner_id) on delete restrict,
  constraint units_name_length check (char_length(name) between 1 and 160)
);

create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null,
  phone text not null,
  email text,
  retired_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, owner_id),
  constraint tenants_name_length check (char_length(full_name) between 1 and 160),
  constraint tenants_phone_length check (char_length(phone) between 6 and 32)
);

create table if not exists public.leases (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  unit_id uuid not null,
  tenant_id uuid not null,
  monthly_rent numeric(12,0) not null check (monthly_rent > 0),
  due_day smallint not null check (due_day between 1 and 31),
  starts_on date not null,
  ends_on date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, owner_id),
  foreign key (unit_id, owner_id) references public.units(id, owner_id) on delete restrict,
  foreign key (tenant_id, owner_id) references public.tenants(id, owner_id) on delete restrict,
  constraint leases_end_after_start check (ends_on is null or ends_on >= starts_on)
);
create unique index if not exists leases_one_active_per_unit on public.leases(unit_id) where active;

create table if not exists public.lease_rent_changes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  lease_id uuid not null,
  new_monthly_rent numeric(12,0) not null check (new_monthly_rent > 0),
  effective_month date not null,
  created_at timestamptz not null default now(),
  unique (lease_id, effective_month),
  foreign key (lease_id, owner_id) references public.leases(id, owner_id) on delete restrict,
  constraint rent_change_first_of_month check (extract(day from effective_month) = 1)
);

create table if not exists public.rent_periods (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  lease_id uuid not null,
  period_month date not null,
  due_on date not null,
  amount_due numeric(12,0) not null check (amount_due > 0),
  status public.rent_status not null default 'upcoming',
  generated_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lease_id, period_month),
  unique (id, owner_id),
  foreign key (lease_id, owner_id) references public.leases(id, owner_id) on delete restrict,
  constraint rent_period_first_of_month check (extract(day from period_month) = 1)
);

create table if not exists public.payment_declarations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  rent_period_id uuid not null,
  method public.payment_method not null,
  status public.payment_status not null default 'pending',
  amount numeric(12,0) not null check (amount > 0),
  reference text,
  declared_at timestamptz not null default now(),
  paid_on date,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, owner_id),
  foreign key (rent_period_id, owner_id) references public.rent_periods(id, owner_id) on delete restrict,
  constraint payment_reference_length check (reference is null or char_length(reference) <= 160),
  constraint payment_rejection_length check (rejection_reason is null or char_length(rejection_reason) <= 500)
);
create unique index if not exists payment_one_confirmed_per_period
  on public.payment_declarations(rent_period_id) where status = 'confirmed';
create index if not exists payment_owner_status_idx on public.payment_declarations(owner_id, status, declared_at desc);

create table if not exists public.receipts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  payment_id uuid not null unique,
  receipt_number text not null unique,
  status text not null default 'issued' check (status in ('issued', 'cancelled')),
  owner_name text not null,
  tenant_name text not null,
  unit_name text not null,
  period_month date not null,
  amount numeric(12,0) not null check (amount > 0),
  method public.payment_method not null,
  paid_on date not null,
  issued_at timestamptz not null default now(),
  cancelled_at timestamptz,
  foreign key (payment_id, owner_id) references public.payment_declarations(id, owner_id) on delete restrict
);

create table if not exists public.tenant_payment_links (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  rent_period_id uuid not null,
  token_hash text not null unique,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (rent_period_id, owner_id) references public.rent_periods(id, owner_id) on delete restrict
);
create unique index if not exists tenant_payment_links_one_active_per_period
  on public.tenant_payment_links(rent_period_id) where revoked_at is null;

create table if not exists public.reminder_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  rent_period_id uuid not null,
  reminder_kind text not null check (reminder_kind in ('day_minus_5', 'due_day', 'manual')),
  channel text not null default 'whatsapp' check (channel in ('whatsapp', 'sms', 'other')),
  prepared_at timestamptz not null default now(),
  opened_at timestamptz,
  foreign key (rent_period_id, owner_id) references public.rent_periods(id, owner_id) on delete restrict
);

create table if not exists public.audit_events (
  id bigint generated always as identity primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  entity_table text not null,
  entity_id text not null,
  action text not null,
  before_data jsonb,
  after_data jsonb,
  occurred_at timestamptz not null default now()
);

-- Plans volontairement non préremplis tant que les tarifs ne sont pas décidés.
create table if not exists public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  max_occupied_units integer,
  monthly_price numeric(12,0),
  currency text not null default 'XAF',
  enabled boolean not null default false,
  display_order smallint not null default 0,
  created_at timestamptz not null default now(),
  constraint plan_units_positive check (max_occupied_units is null or max_occupied_units > 0),
  constraint plan_price_nonnegative check (monthly_price is null or monthly_price >= 0),
  constraint plan_currency_xaf check (currency = 'XAF')
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users(id) on delete cascade,
  plan_id uuid references public.subscription_plans(id) on delete set null,
  status public.subscription_status not null default 'trial',
  trial_started_at timestamptz not null default now(),
  trial_ends_at timestamptz not null default (now() + interval '1 month'),
  current_period_ends_at timestamptz,
  occupied_unit_limit integer,
  updated_at timestamptz not null default now()
);

-- Liste de contrôle d'accès administrateur. Aucun accès direct via anon/authenticated.
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  added_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.subscription_events (
  id bigint generated always as identity primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  event_type text not null check (event_type in ('trial_started', 'plan_assigned', 'activated', 'read_only', 'cancelled', 'expired')),
  details jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create index if not exists properties_owner_idx on public.properties(owner_id);
create index if not exists units_property_idx on public.units(owner_id, property_id);
create index if not exists tenants_owner_idx on public.tenants(owner_id);
create index if not exists leases_unit_idx on public.leases(owner_id, unit_id, active);
create index if not exists lease_rent_changes_owner_idx on public.lease_rent_changes(owner_id, lease_id, effective_month desc);
create index if not exists rent_period_owner_month_idx on public.rent_periods(owner_id, period_month desc);
create index if not exists links_period_idx on public.tenant_payment_links(rent_period_id);
create index if not exists audit_owner_time_idx on public.audit_events(owner_id, occurred_at desc);
create index if not exists subscription_events_owner_time_idx on public.subscription_events(owner_id, occurred_at desc);

-- Profil créé par Auth. Les métadonnées de rôle côté client ne sont jamais utilisées.
create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(user_id, full_name, phone, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.phone,
    new.email
  ) on conflict (user_id) do nothing;
  insert into public.subscriptions(owner_id) values (new.id) on conflict (owner_id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created_rentflow on auth.users;
create trigger on_auth_user_created_rentflow after insert on auth.users
for each row execute function public.handle_new_auth_user();

-- Rattrapage idempotent si des utilisateurs Auth existent déjà avant cette migration.
insert into public.profiles(user_id, full_name, phone, email)
select u.id, coalesce(u.raw_user_meta_data ->> 'full_name', ''), u.phone, u.email
from auth.users u on conflict (user_id) do nothing;
insert into public.subscriptions(owner_id)
select u.id from auth.users u on conflict (owner_id) do nothing;

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;
do $$ declare t text; begin
  foreach t in array array['profiles','properties','units','tenants','leases','rent_periods','payment_declarations','subscriptions'] loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- Journal append-only pour les changements financiers et de bail.
create or replace function public.write_audit_event()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_owner uuid; v_id text; v_before jsonb; v_after jsonb;
begin
  if tg_op = 'INSERT' then v_after := to_jsonb(new); v_owner := (v_after ->> 'owner_id')::uuid; v_id := v_after ->> 'id';
  elsif tg_op = 'UPDATE' then v_before := to_jsonb(old); v_after := to_jsonb(new); v_owner := (v_after ->> 'owner_id')::uuid; v_id := v_after ->> 'id';
  else v_before := to_jsonb(old); v_owner := (v_before ->> 'owner_id')::uuid; v_id := v_before ->> 'id'; end if;
  insert into public.audit_events(owner_id, actor_id, entity_table, entity_id, action, before_data, after_data)
  values (v_owner, auth.uid(), tg_table_name, v_id, tg_op, v_before, v_after);
  return null; -- trigger AFTER : la valeur de retour est ignorée
end;
$$;
drop trigger if exists audit_lease_changes on public.leases;
create trigger audit_lease_changes after insert or update or delete on public.leases
for each row execute function public.write_audit_event();
drop trigger if exists audit_payment_changes on public.payment_declarations;
create trigger audit_payment_changes after insert or update or delete on public.payment_declarations
for each row execute function public.write_audit_event();

-- Une quittance est une photographie des données à l'émission, pas un document légal certifié.
create or replace function public.sync_receipt_for_payment()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_period public.rent_periods%rowtype; v_lease public.leases%rowtype; v_tenant public.tenants%rowtype;
        v_unit public.units%rowtype; v_profile public.profiles%rowtype;
begin
  if new.status = 'confirmed' and (tg_op = 'INSERT' or (tg_op = 'UPDATE' and old.status is distinct from 'confirmed')) then
    select * into v_period from public.rent_periods where id = new.rent_period_id and owner_id = new.owner_id;
    select * into v_lease from public.leases where id = v_period.lease_id and owner_id = new.owner_id;
    select * into v_tenant from public.tenants where id = v_lease.tenant_id and owner_id = new.owner_id;
    select * into v_unit from public.units where id = v_lease.unit_id and owner_id = new.owner_id;
    select * into v_profile from public.profiles where user_id = new.owner_id;
    insert into public.receipts(owner_id, payment_id, receipt_number, owner_name, tenant_name, unit_name, period_month, amount, method, paid_on)
    values (new.owner_id, new.id, 'RF-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)),
      coalesce(v_profile.full_name, ''), v_tenant.full_name, v_unit.name, v_period.period_month, new.amount, new.method, coalesce(new.paid_on, current_date))
    on conflict (payment_id) do update set status = 'issued', cancelled_at = null;
    update public.rent_periods set status = 'paid', updated_at = now() where id = new.rent_period_id;
  elsif tg_op = 'UPDATE' and new.status = 'cancelled' and old.status = 'confirmed' then
    update public.receipts set status = 'cancelled', cancelled_at = now() where payment_id = new.id;
    update public.rent_periods set status = 'due', updated_at = now() where id = new.rent_period_id;
  elsif tg_op = 'UPDATE' and new.status in ('rejected', 'cancelled') and old.status = 'pending' then
    update public.rent_periods set status = 'due', updated_at = now() where id = new.rent_period_id;
  end if;
  return new;
end;
$$;
drop trigger if exists payment_receipt_sync on public.payment_declarations;
create trigger payment_receipt_sync after insert or update of status on public.payment_declarations
for each row execute function public.sync_receipt_for_payment();

-- Une échéance au jour 29, 30 ou 31 tombe le dernier jour des mois plus courts.
create or replace function public.monthly_due_date(p_month date, p_day integer)
returns date language sql immutable strict set search_path = '' as $$
  select make_date(extract(year from p_month)::integer, extract(month from p_month)::integer,
                   least(p_day, extract(day from (date_trunc('month', p_month) + interval '1 month - 1 day'))::integer));
$$;

