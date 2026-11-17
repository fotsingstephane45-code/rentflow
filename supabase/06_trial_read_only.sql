-- RentFlow · passage effectif en lecture seule à la fin de l'essai.
-- À exécuter après 01_schema.sql et les migrations 03, 04 et 05.
-- Un compte sans essai en cours ou abonnement actif peut consulter ses données,
-- mais les écritures propriétaires sont refusées au niveau PostgreSQL.

create or replace function public.owner_subscription_allows_write()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.subscriptions s
    where s.owner_id = auth.uid()
      and (
        (s.status = 'trial' and s.trial_ends_at > now())
        or (s.status = 'active' and (s.current_period_ends_at is null or s.current_period_ends_at > now()))
      )
  );
$$;
revoke execute on function public.owner_subscription_allows_write() from public, anon;
grant execute on function public.owner_subscription_allows_write() to authenticated;

create or replace function public.guard_owner_subscription_write()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_owner uuid; v_actor uuid := auth.uid();
begin
  if tg_op = 'DELETE' then v_owner := old.owner_id; else v_owner := new.owner_id; end if;
  -- Les appels anonymes de déclaration locataire et les opérations service_role
  -- ne sont pas des mutations initiées par le propriétaire.
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
  foreach v_table in array array[
    'properties','units','tenants','leases','lease_rent_changes','tenant_payment_links',
    'payment_declarations','receipts'
  ] loop
    execute format('drop trigger if exists owner_subscription_write_guard on public.%I', v_table);
    execute format(
      'create trigger owner_subscription_write_guard before insert or update or delete on public.%I for each row execute function public.guard_owner_subscription_write()',
      v_table
    );
  end loop;
end $$;
