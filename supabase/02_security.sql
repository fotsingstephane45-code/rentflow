-- RentFlow · droits, RLS et fonctions contrôlées
-- Pré-requis : exécuter 01_schema.sql avant ce fichier.
-- Les utilisateurs et les sessions restent gérés par Supabase Auth.

-- RLS sur chaque table accessible via l'API Data.
alter table public.profiles enable row level security;
alter table public.properties enable row level security;
alter table public.units enable row level security;
alter table public.tenants enable row level security;
alter table public.leases enable row level security;
alter table public.lease_rent_changes enable row level security;
alter table public.rent_periods enable row level security;
alter table public.payment_declarations enable row level security;
alter table public.receipts enable row level security;
alter table public.tenant_payment_links enable row level security;
alter table public.reminder_events enable row level security;
alter table public.audit_events enable row level security;
alter table public.subscriptions enable row level security;
alter table public.subscription_plans enable row level security;
alter table public.admin_users enable row level security;
alter table public.subscription_events enable row level security;

-- Les privilèges SQL et les politiques RLS sont tous deux nécessaires.
revoke all on table public.profiles, public.properties, public.units, public.tenants,
  public.leases, public.rent_periods, public.payment_declarations, public.receipts,
  public.tenant_payment_links, public.reminder_events, public.audit_events,
  public.subscriptions, public.subscription_plans, public.admin_users,
  public.subscription_events, public.lease_rent_changes from anon, authenticated;

grant select on public.profiles, public.properties, public.units, public.tenants,
  public.leases, public.rent_periods, public.payment_declarations, public.receipts,
  public.lease_rent_changes, public.reminder_events, public.audit_events,
  public.subscriptions, public.subscription_events to authenticated;
grant select on public.subscription_plans to anon, authenticated;
grant select (id, owner_id, rent_period_id, expires_at, revoked_at, created_at)
  on public.tenant_payment_links to authenticated;

grant insert, update, delete on public.properties, public.units to authenticated;
grant update (account_kind, full_name, phone, email, orange_money_phone, mtn_momo_phone, timezone)
  on public.profiles to authenticated;

create or replace function public.owner_subscription_allows_write()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.subscriptions s
    where s.owner_id = auth.uid()
      and ((s.status = 'trial' and s.trial_ends_at > now())
        or (s.status = 'active' and (s.current_period_ends_at is null or s.current_period_ends_at > now())))
  );
$$;
revoke execute on function public.owner_subscription_allows_write() from public, anon;
grant execute on function public.owner_subscription_allows_write() to authenticated;

create or replace function public.guard_owner_subscription_write()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_owner uuid; v_actor uuid := auth.uid();
begin
  if tg_op = 'DELETE' then v_owner := old.owner_id; else v_owner := new.owner_id; end if;
  if v_actor is not null and v_actor = v_owner and not public.owner_subscription_allows_write() then
    raise exception 'subscription_read_only' using errcode = '55000';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
revoke execute on function public.guard_owner_subscription_write() from public, anon, authenticated;
do $$
declare v_table text;
begin
  foreach v_table in array array['properties','units','tenants','leases','lease_rent_changes','tenant_payment_links','payment_declarations','receipts'] loop
    execute format('drop trigger if exists owner_subscription_write_guard on public.%I', v_table);
    execute format('create trigger owner_subscription_write_guard before insert or update or delete on public.%I for each row execute function public.guard_owner_subscription_write()', v_table);
  end loop;
end $$;

drop policy if exists profile_read_self on public.profiles;
create policy profile_read_self on public.profiles for select to authenticated
  using (user_id = (select auth.uid()));
drop policy if exists profile_update_self on public.profiles;
create policy profile_update_self on public.profiles for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists properties_owner_all on public.properties;
create policy properties_owner_all on public.properties for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
drop policy if exists units_owner_all on public.units;
create policy units_owner_all on public.units for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
drop policy if exists tenants_owner_all on public.tenants;
create policy tenants_owner_all on public.tenants for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
drop policy if exists leases_owner_all on public.leases;
create policy leases_owner_all on public.leases for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
drop policy if exists lease_rent_changes_read_owner on public.lease_rent_changes;
create policy lease_rent_changes_read_owner on public.lease_rent_changes for select to authenticated
  using (owner_id = (select auth.uid()));

drop policy if exists rent_periods_read_owner on public.rent_periods;
create policy rent_periods_read_owner on public.rent_periods for select to authenticated
  using (owner_id = (select auth.uid()));
drop policy if exists payments_read_owner on public.payment_declarations;
create policy payments_read_owner on public.payment_declarations for select to authenticated
  using (owner_id = (select auth.uid()));
drop policy if exists receipts_read_owner on public.receipts;
create policy receipts_read_owner on public.receipts for select to authenticated
  using (owner_id = (select auth.uid()));
drop policy if exists tenant_links_read_owner on public.tenant_payment_links;
create policy tenant_links_read_owner on public.tenant_payment_links for select to authenticated
  using (owner_id = (select auth.uid()));
drop policy if exists reminders_read_owner on public.reminder_events;
create policy reminders_read_owner on public.reminder_events for select to authenticated
  using (owner_id = (select auth.uid()));
drop policy if exists audit_read_owner on public.audit_events;
create policy audit_read_owner on public.audit_events for select to authenticated
  using (owner_id = (select auth.uid()));
drop policy if exists subscription_read_owner on public.subscriptions;
create policy subscription_read_owner on public.subscriptions for select to authenticated
  using (owner_id = (select auth.uid()));
drop policy if exists subscription_events_read_owner on public.subscription_events;
create policy subscription_events_read_owner on public.subscription_events for select to authenticated
  using (owner_id = (select auth.uid()));
drop policy if exists enabled_plans_are_public on public.subscription_plans;
create policy enabled_plans_are_public on public.subscription_plans for select to anon, authenticated
  using (enabled);

-- Création d'un lien bearer fort. Seul le hash est conservé en base.
create or replace function public.create_tenant_payment_link(p_rent_period_id uuid, p_expires_at timestamptz default null)
returns text language plpgsql security definer set search_path = '' as $$
declare v_token text; v_owner uuid := auth.uid(); v_expires_at timestamptz := coalesce(p_expires_at, now() + interval '14 days');
begin
  if v_owner is null then raise exception 'authentication_required' using errcode = '28000'; end if;
  if not public.owner_subscription_allows_write() then raise exception 'subscription_read_only' using errcode = '55000'; end if;
  if v_expires_at <= now() or v_expires_at > now() + interval '30 days' then
    raise exception 'invalid_link_expiration' using errcode = '22023';
  end if;
  if not exists (select 1 from public.rent_periods rp where rp.id = p_rent_period_id and rp.owner_id = v_owner) then
    raise exception 'rent_period_not_found' using errcode = 'P0002';
  end if;
  update public.tenant_payment_links set revoked_at = now()
  where owner_id = v_owner and rent_period_id = p_rent_period_id and revoked_at is null;
  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  insert into public.tenant_payment_links(owner_id, rent_period_id, token_hash, expires_at)
  values (v_owner, p_rent_period_id, encode(extensions.digest(convert_to(v_token, 'UTF8'), 'sha256'), 'hex'), v_expires_at);
  return v_token;
end;
$$;

create or replace function public.revoke_tenant_payment_link(p_link_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_owner uuid := auth.uid(); v_count integer;
begin
  if v_owner is null then raise exception 'authentication_required' using errcode = '28000'; end if;
  update public.tenant_payment_links set revoked_at = now()
  where id = p_link_id and owner_id = v_owner and revoked_at is null;
  get diagnostics v_count = row_count;
  return v_count = 1;
end;
$$;

-- Lecture publique volontairement limitée au loyer visé par le jeton.
create or replace function public.get_tenant_payment(p_token text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'owner_name', prof.full_name,
    'unit_name', u.name,
    'property_name', prop.name,
    'city', prop.city,
    'tenant_name', ten.full_name,
    'amount_due', rp.amount_due,
    'due_on', rp.due_on,
    'period_month', rp.period_month,
    'status', rp.status,
    'orange_money_phone', prof.orange_money_phone,
    'mtn_momo_phone', prof.mtn_momo_phone
  )
  from public.tenant_payment_links l
  join public.rent_periods rp on rp.id = l.rent_period_id and rp.owner_id = l.owner_id
  join public.leases le on le.id = rp.lease_id and le.owner_id = rp.owner_id
  join public.units u on u.id = le.unit_id and u.owner_id = le.owner_id
  join public.properties prop on prop.id = u.property_id and prop.owner_id = u.owner_id
  join public.tenants ten on ten.id = le.tenant_id and ten.owner_id = le.owner_id
  join public.profiles prof on prof.user_id = l.owner_id
  where p_token is not null and char_length(p_token) = 64
    and l.token_hash = encode(extensions.digest(convert_to(p_token, 'UTF8'), 'sha256'), 'hex')
    and l.revoked_at is null and (l.expires_at is null or l.expires_at > now())
  limit 1;
$$;

-- Le locataire peut seulement déclarer le paiement de la période liée au jeton.
create or replace function public.submit_tenant_payment(
  p_token text, p_method public.payment_method, p_paid_on date default current_date, p_reference text default null
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_link public.tenant_payment_links%rowtype; v_period public.rent_periods%rowtype; v_id uuid;
begin
  if p_token is null or char_length(p_token) <> 64 then raise exception 'invalid_link' using errcode = '22023'; end if;
  if p_method not in ('orange_money', 'mtn_momo', 'cash') then raise exception 'invalid_payment_method' using errcode = '22023'; end if;
  if p_reference is not null and char_length(p_reference) > 160 then raise exception 'reference_too_long' using errcode = '22023'; end if;
  select * into v_link from public.tenant_payment_links l
    where l.token_hash = encode(extensions.digest(convert_to(p_token, 'UTF8'), 'sha256'), 'hex')
      and l.revoked_at is null and (l.expires_at is null or l.expires_at > now()) for update;
  if not found then raise exception 'invalid_or_expired_link' using errcode = 'P0002'; end if;
  select * into v_period from public.rent_periods rp where rp.id = v_link.rent_period_id and rp.owner_id = v_link.owner_id for update;
  if not found or v_period.status in ('paid', 'cancelled') then raise exception 'rent_not_payable' using errcode = '55000'; end if;
  if exists (select 1 from public.payment_declarations p where p.rent_period_id = v_period.id and p.status = 'pending') then
    raise exception 'payment_already_declared' using errcode = '23505';
  end if;
  insert into public.payment_declarations(owner_id, rent_period_id, method, amount, reference, paid_on, status)
  values (v_link.owner_id, v_period.id, p_method, v_period.amount_due, nullif(p_reference, ''), p_paid_on, 'pending') returning id into v_id;
  update public.rent_periods set status = 'awaiting_confirmation', updated_at = now() where id = v_period.id;
  return v_id;
end;
$$;

-- Fonctions propriétaire : aucune écriture financière directe n'est accordée aux clients API.
create or replace function public.confirm_rent_payment(p_payment_id uuid, p_verified_reference text default null)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_owner uuid := auth.uid(); v_count integer;
begin
  if v_owner is null then raise exception 'authentication_required' using errcode = '28000'; end if;
  update public.payment_declarations set status = 'confirmed', reference = coalesce(nullif(p_verified_reference, ''), reference),
    reviewed_at = now(), reviewed_by = v_owner, rejection_reason = null, paid_on = coalesce(paid_on, current_date)
  where id = p_payment_id and owner_id = v_owner and status = 'pending';
  get diagnostics v_count = row_count;
  if v_count = 0 then raise exception 'pending_payment_not_found' using errcode = 'P0002'; end if;
  return true;
end;
$$;

create or replace function public.reject_rent_payment(p_payment_id uuid, p_reason text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_owner uuid := auth.uid(); v_count integer;
begin
  if v_owner is null then raise exception 'authentication_required' using errcode = '28000'; end if;
  if p_reason is null or char_length(trim(p_reason)) < 4 or char_length(p_reason) > 500 then
    raise exception 'rejection_reason_required' using errcode = '22023';
  end if;
  update public.payment_declarations set status = 'rejected', rejection_reason = trim(p_reason), reviewed_at = now(), reviewed_by = v_owner
  where id = p_payment_id and owner_id = v_owner and status = 'pending';
  get diagnostics v_count = row_count;
  if v_count = 0 then raise exception 'pending_payment_not_found' using errcode = 'P0002'; end if;
  return true;
end;
$$;

create or replace function public.register_cash_rent_payment(p_rent_period_id uuid, p_paid_on date default current_date, p_reference text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_owner uuid := auth.uid(); v_period public.rent_periods%rowtype; v_id uuid;
begin
  if v_owner is null then raise exception 'authentication_required' using errcode = '28000'; end if;
  select * into v_period from public.rent_periods where id = p_rent_period_id and owner_id = v_owner for update;
  if not found or v_period.status in ('paid', 'cancelled') then raise exception 'rent_not_payable' using errcode = 'P0002'; end if;
  if exists (select 1 from public.payment_declarations p where p.rent_period_id = v_period.id and p.status = 'pending') then
    raise exception 'payment_pending_review' using errcode = '55000';
  end if;
  if p_reference is not null and char_length(p_reference) > 160 then raise exception 'reference_too_long' using errcode = '22023'; end if;
  insert into public.payment_declarations(owner_id, rent_period_id, method, status, amount, reference, paid_on, reviewed_at, reviewed_by)
  values (v_owner, v_period.id, 'cash', 'confirmed', v_period.amount_due, nullif(p_reference, ''), p_paid_on, now(), v_owner)
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.cancel_confirmed_rent_payment(p_payment_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_owner uuid := auth.uid(); v_count integer;
begin
  if v_owner is null then raise exception 'authentication_required' using errcode = '28000'; end if;
  update public.payment_declarations set status = 'cancelled', reviewed_at = now(), reviewed_by = v_owner
  where id = p_payment_id and owner_id = v_owner and status = 'confirmed';
  get diagnostics v_count = row_count;
  if v_count = 0 then raise exception 'confirmed_payment_not_found' using errcode = 'P0002'; end if;
  return true;
end;
$$;

create or replace function public.generate_monthly_rent_periods(p_month date default null)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_owner uuid := auth.uid(); v_count integer; v_timezone text; v_today date; v_month date;
begin
  if v_owner is null then raise exception 'authentication_required' using errcode = '28000'; end if;
  select timezone into v_timezone from public.profiles where user_id = v_owner;
  v_today := (now() at time zone coalesce(v_timezone, 'Africa/Douala'))::date;
  v_month := date_trunc('month', coalesce(p_month, v_today))::date;
  if not public.owner_subscription_allows_write() then return 0; end if;
  update public.rent_periods rp set status =
    case when rp.due_on < v_today then 'overdue'::public.rent_status
         when rp.due_on = v_today then 'due'::public.rent_status
         else 'upcoming'::public.rent_status end,
    updated_at = now()
  where rp.owner_id = v_owner and rp.status in ('upcoming', 'due', 'overdue');
  insert into public.rent_periods(owner_id, lease_id, period_month, due_on, amount_due, status)
  select v_owner, le.id, v_month, public.monthly_due_date(v_month, le.due_day),
    coalesce((select rc.new_monthly_rent from public.lease_rent_changes rc where rc.lease_id = le.id and rc.owner_id = v_owner and rc.effective_month <= v_month order by rc.effective_month desc limit 1), le.monthly_rent),
    case when public.monthly_due_date(v_month, le.due_day) < v_today then 'overdue'::public.rent_status
         when public.monthly_due_date(v_month, le.due_day) = v_today then 'due'::public.rent_status
         else 'upcoming'::public.rent_status end
  from public.leases le
  where le.owner_id = v_owner and le.active and le.starts_on <= (v_month + interval '1 month - 1 day')::date
    and (le.ends_on is null or le.ends_on >= v_month)
    and public.monthly_due_date(v_month, le.due_day) >= le.starts_on
  on conflict (lease_id, period_month) do nothing;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function public.schedule_lease_rent_change(p_lease_id uuid, p_new_monthly_rent numeric)
returns date language plpgsql security definer set search_path = '' as $$
declare v_owner uuid := auth.uid(); v_timezone text; v_today date; v_effective_month date;
begin
  if v_owner is null then raise exception 'authentication_required' using errcode = '28000'; end if;
  select timezone into v_timezone from public.profiles where user_id = v_owner;
  v_today := (now() at time zone coalesce(v_timezone, 'Africa/Douala'))::date;
  v_effective_month := (date_trunc('month', v_today) + interval '1 month')::date;
  if p_new_monthly_rent is null or p_new_monthly_rent <= 0 or p_new_monthly_rent <> trunc(p_new_monthly_rent) then
    raise exception 'invalid_rent_amount' using errcode = '22023';
  end if;
  if not exists (select 1 from public.leases where id = p_lease_id and owner_id = v_owner and active) then
    raise exception 'active_lease_not_found' using errcode = 'P0002';
  end if;
  insert into public.lease_rent_changes(owner_id, lease_id, new_monthly_rent, effective_month)
  values (v_owner, p_lease_id, p_new_monthly_rent, v_effective_month)
  on conflict (lease_id, effective_month) do update set new_monthly_rent = excluded.new_monthly_rent;
  return v_effective_month;
end;
$$;

create or replace function public.end_lease(p_lease_id uuid)
returns date language plpgsql security definer set search_path = '' as $$
declare v_owner uuid := auth.uid(); v_lease public.leases%rowtype; v_timezone text; v_today date; v_ends_on date;
begin
  if v_owner is null then raise exception 'authentication_required' using errcode = '28000'; end if;
  select * into v_lease from public.leases where id = p_lease_id and owner_id = v_owner and active for update;
  if not found then raise exception 'active_lease_not_found' using errcode = 'P0002'; end if;
  if exists (select 1 from public.payment_declarations p join public.rent_periods rp on rp.id = p.rent_period_id
    where rp.lease_id = v_lease.id and p.owner_id = v_owner and p.status = 'pending') then
    raise exception 'payment_pending_review' using errcode = '55000';
  end if;
  select timezone into v_timezone from public.profiles where user_id = v_owner;
  v_today := (now() at time zone coalesce(v_timezone, 'Africa/Douala'))::date;
  v_ends_on := greatest(v_lease.starts_on, least(coalesce(v_lease.ends_on, v_today), v_today));
  update public.leases set active = false, ends_on = v_ends_on where id = v_lease.id and owner_id = v_owner;
  update public.rent_periods set status = 'cancelled', updated_at = now()
  where lease_id = v_lease.id and owner_id = v_owner and due_on > v_ends_on
    and status in ('upcoming', 'due', 'overdue');
  return v_ends_on;
end;
$$;

create or replace function public.update_rental_unit(
  p_unit_id uuid, p_property_name text, p_unit_name text, p_new_monthly_rent numeric
)
returns date language plpgsql security definer set search_path = '' as $$
declare v_owner uuid := auth.uid(); v_lease public.leases%rowtype; v_timezone text; v_effective_month date;
begin
  if v_owner is null then raise exception 'authentication_required' using errcode = '28000'; end if;
  if p_property_name is null or char_length(trim(p_property_name)) not between 1 and 160
    or p_unit_name is null or char_length(trim(p_unit_name)) not between 1 and 160 then
    raise exception 'invalid_unit_name' using errcode = '22023';
  end if;
  perform 1 from public.units where id = p_unit_id and owner_id = v_owner for update;
  if not found then raise exception 'unit_not_found' using errcode = 'P0002'; end if;
  select * into v_lease from public.leases where unit_id = p_unit_id and owner_id = v_owner and active for update;
  if found then
    if p_new_monthly_rent is null or p_new_monthly_rent <= 0 or p_new_monthly_rent <> trunc(p_new_monthly_rent) then
      raise exception 'invalid_rent_amount' using errcode = '22023';
    end if;
    select timezone into v_timezone from public.profiles where user_id = v_owner;
    v_effective_month := (date_trunc('month', (now() at time zone coalesce(v_timezone, 'Africa/Douala'))::date) + interval '1 month')::date;
    insert into public.lease_rent_changes(owner_id, lease_id, new_monthly_rent, effective_month)
    values (v_owner, v_lease.id, p_new_monthly_rent, v_effective_month)
    on conflict (lease_id, effective_month) do update set new_monthly_rent = excluded.new_monthly_rent;
  elsif coalesce(p_new_monthly_rent, 0) <> 0 then
    raise exception 'vacant_unit_rent_must_be_zero' using errcode = '22023';
  end if;
  update public.properties prop set name = trim(p_property_name)
  from public.units u where u.id = p_unit_id and u.owner_id = v_owner and prop.id = u.property_id and prop.owner_id = v_owner;
  update public.units set name = trim(p_unit_name) where id = p_unit_id and owner_id = v_owner;
  return v_effective_month;
end;
$$;

create or replace function public.create_tenant_lease(
  p_unit_id uuid, p_full_name text, p_phone text, p_monthly_rent numeric, p_due_day smallint, p_starts_on date
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_owner uuid := auth.uid(); v_tenant_id uuid; v_lease_id uuid;
begin
  if v_owner is null then raise exception 'authentication_required' using errcode = '28000'; end if;
  if p_full_name is null or char_length(trim(p_full_name)) not between 1 and 160
    or p_phone is null or char_length(trim(p_phone)) not between 6 and 32
    or p_monthly_rent is null or p_monthly_rent <= 0 or p_monthly_rent <> trunc(p_monthly_rent)
    or p_due_day is null or p_due_day not between 1 and 31 or p_starts_on is null then
    raise exception 'invalid_lease_details' using errcode = '22023';
  end if;
  perform 1 from public.units u join public.properties p on p.id = u.property_id and p.owner_id = u.owner_id
  where u.id = p_unit_id and u.owner_id = v_owner and u.archived_at is null and p.archived_at is null for update of u;
  if not found then raise exception 'unit_not_found_or_archived' using errcode = 'P0002'; end if;
  if exists (select 1 from public.leases where unit_id = p_unit_id and owner_id = v_owner and active) then
    raise exception 'unit_already_occupied' using errcode = '23505';
  end if;
  insert into public.tenants(owner_id, full_name, phone)
  values (v_owner, trim(p_full_name), trim(p_phone)) returning id into v_tenant_id;
  insert into public.leases(owner_id, unit_id, tenant_id, monthly_rent, due_day, starts_on, active)
  values (v_owner, p_unit_id, v_tenant_id, p_monthly_rent, p_due_day, p_starts_on, true) returning id into v_lease_id;
  perform public.generate_monthly_rent_periods(p_starts_on);
  return v_lease_id;
end;
$$;



-- Refus explicite d'exécution implicite des fonctions; seules les signatures ci-dessous sont appelables.
revoke execute on function public.handle_new_auth_user() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.write_audit_event() from public, anon, authenticated;
revoke execute on function public.sync_receipt_for_payment() from public, anon, authenticated;
revoke execute on function public.monthly_due_date(date, integer) from public, anon, authenticated;
revoke execute on function public.create_tenant_payment_link(uuid, timestamptz) from public, anon, authenticated;
revoke execute on function public.revoke_tenant_payment_link(uuid) from public, anon, authenticated;
revoke execute on function public.get_tenant_payment(text) from public, anon, authenticated;
revoke execute on function public.submit_tenant_payment(text, public.payment_method, date, text) from public, anon, authenticated;
revoke execute on function public.confirm_rent_payment(uuid, text) from public, anon, authenticated;
revoke execute on function public.reject_rent_payment(uuid, text) from public, anon, authenticated;
revoke execute on function public.register_cash_rent_payment(uuid, date, text) from public, anon, authenticated;
revoke execute on function public.cancel_confirmed_rent_payment(uuid) from public, anon, authenticated;
revoke execute on function public.generate_monthly_rent_periods(date) from public, anon, authenticated;
revoke execute on function public.schedule_lease_rent_change(uuid, numeric) from public, anon, authenticated;
revoke execute on function public.end_lease(uuid) from public, anon, authenticated;
revoke execute on function public.update_rental_unit(uuid, text, text, numeric) from public, anon, authenticated;
revoke execute on function public.create_tenant_lease(uuid, text, text, numeric, smallint, date) from public, anon, authenticated;

grant execute on function public.create_tenant_payment_link(uuid, timestamptz) to authenticated;
grant execute on function public.revoke_tenant_payment_link(uuid) to authenticated;
grant execute on function public.get_tenant_payment(text) to anon, authenticated;
grant execute on function public.submit_tenant_payment(text, public.payment_method, date, text) to anon, authenticated;
grant execute on function public.confirm_rent_payment(uuid, text) to authenticated;
grant execute on function public.reject_rent_payment(uuid, text) to authenticated;
grant execute on function public.register_cash_rent_payment(uuid, date, text) to authenticated;
grant execute on function public.cancel_confirmed_rent_payment(uuid) to authenticated;
grant execute on function public.generate_monthly_rent_periods(date) to authenticated;
grant execute on function public.schedule_lease_rent_change(uuid, numeric) to authenticated;
grant execute on function public.end_lease(uuid) to authenticated;
grant execute on function public.update_rental_unit(uuid, text, text, numeric) to authenticated;
grant execute on function public.create_tenant_lease(uuid, text, text, numeric, smallint, date) to authenticated;

-- Configuration Supabase Dashboard à appliquer séparément :
-- Auth > URL Configuration : URL du site + URL(s) localhost autorisées, et redirect URLs exactes.
-- Auth > Sign In : activer Email/Password et configurer les modèles d'e-mail de confirmation/reset.
-- Auth > Sessions : choisir durée maximale et inactivité selon le produit; Supabase gère auth.sessions.
-- Auth > Rate Limits / CAPTCHA : protéger inscription, récupération et fonctions publiques tenant.
-- API : ne jamais mettre la clé service_role/secret dans le navigateur; clé publishable uniquement.
-- Storage : aucun bucket public pour quittances ou pièces; signer les accès si des fichiers sont ajoutés.

