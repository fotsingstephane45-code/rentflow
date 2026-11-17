-- RentFlow · historique et planification des changements de loyer
-- À exécuter après 01_schema.sql, 02_security.sql et 03_public_tenant_receipt_and_cash_guard.sql.

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

create index if not exists lease_rent_changes_lookup_idx
  on public.lease_rent_changes(owner_id, lease_id, effective_month desc);

alter table public.lease_rent_changes enable row level security;
revoke all on table public.lease_rent_changes from anon, authenticated;
grant select on public.lease_rent_changes to authenticated;
drop policy if exists lease_rent_changes_read_owner on public.lease_rent_changes;
create policy lease_rent_changes_read_owner on public.lease_rent_changes
  for select to authenticated using (owner_id = (select auth.uid()));

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
    coalesce((select rc.new_monthly_rent from public.lease_rent_changes rc
      where rc.lease_id = le.id and rc.owner_id = v_owner and rc.effective_month <= v_month
      order by rc.effective_month desc limit 1), le.monthly_rent),
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

revoke execute on function public.generate_monthly_rent_periods(date) from public, anon, authenticated;
grant execute on function public.generate_monthly_rent_periods(date) to authenticated;
revoke execute on function public.schedule_lease_rent_change(uuid, numeric) from public, anon, authenticated;
grant execute on function public.schedule_lease_rent_change(uuid, numeric) to authenticated;
