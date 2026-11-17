-- RentFlow · migration complémentaire après 01_schema.sql et 02_security.sql
-- Autorise le locataire porteur d'un lien personnel à consulter la quittance
-- de cette seule échéance et bloque la saisie d'espèces si une déclaration est à vérifier.

-- Résout les anciens liens multiples avant d'imposer un seul lien actif par échéance.
with ranked_links as (
  select id, row_number() over (partition by rent_period_id order by created_at desc, id desc) as position
  from public.tenant_payment_links where revoked_at is null
)
update public.tenant_payment_links l set revoked_at = now()
from ranked_links r where l.id = r.id and r.position > 1;
create unique index if not exists tenant_payment_links_one_active_per_period
  on public.tenant_payment_links(rent_period_id) where revoked_at is null;

-- Un seul lien valide par échéance; le remplacement invalide le lien précédent.
create or replace function public.create_tenant_payment_link(p_rent_period_id uuid, p_expires_at timestamptz default null)
returns text language plpgsql security definer set search_path = '' as $$
declare v_token text; v_owner uuid := auth.uid(); v_expires_at timestamptz := coalesce(p_expires_at, now() + interval '14 days');
begin
  if v_owner is null then raise exception 'authentication_required' using errcode = '28000'; end if;
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

revoke execute on function public.create_tenant_payment_link(uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.create_tenant_payment_link(uuid, timestamptz) to authenticated;

create or replace function public.get_tenant_receipt(p_token text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'receipt_number', r.receipt_number,
    'status', r.status,
    'owner_name', r.owner_name,
    'tenant_name', r.tenant_name,
    'unit_name', r.unit_name,
    'period_month', r.period_month,
    'amount', r.amount,
    'method', r.method,
    'paid_on', r.paid_on,
    'issued_at', r.issued_at,
    'cancelled_at', r.cancelled_at
  )
  from public.tenant_payment_links l
  join public.rent_periods rp on rp.id = l.rent_period_id and rp.owner_id = l.owner_id
  join public.payment_declarations p on p.rent_period_id = rp.id and p.owner_id = rp.owner_id
  join public.receipts r on r.payment_id = p.id and r.owner_id = p.owner_id
  where p_token is not null and char_length(p_token) = 64
    and l.token_hash = encode(extensions.digest(convert_to(p_token, 'UTF8'), 'sha256'), 'hex')
    and l.revoked_at is null and (l.expires_at is null or l.expires_at > now())
  order by r.issued_at desc
  limit 1;
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

revoke execute on function public.get_tenant_receipt(text) from public, anon, authenticated;
grant execute on function public.get_tenant_receipt(text) to anon, authenticated;
revoke execute on function public.register_cash_rent_payment(uuid, date, text) from public, anon, authenticated;
grant execute on function public.register_cash_rent_payment(uuid, date, text) to authenticated;

