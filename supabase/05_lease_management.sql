-- RentFlow · fin de bail contrôlée et protection de l'historique des loyers.
-- À exécuter après les migrations 03 et 04 sur un projet déjà initialisé.

-- La création d'un bail reste possible; ses changements et sa fermeture passent par RPC.
revoke insert, update, delete on table public.leases from authenticated;
revoke insert, update, delete on table public.tenants from authenticated;

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

revoke execute on function public.end_lease(uuid) from public, anon, authenticated;
grant execute on function public.end_lease(uuid) to authenticated;

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

revoke execute on function public.update_rental_unit(uuid, text, text, numeric) from public, anon, authenticated;
grant execute on function public.update_rental_unit(uuid, text, text, numeric) to authenticated;

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

revoke execute on function public.create_tenant_lease(uuid, text, text, numeric, smallint, date) from public, anon, authenticated;
grant execute on function public.create_tenant_lease(uuid, text, text, numeric, smallint, date) to authenticated;
