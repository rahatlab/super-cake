-- ===========================================================================
--  Super Cake — Phase 0–9 hardening migration (additive)
--  Run AFTER supabase/schema.sql and supabase/whatsapp-automation.sql.
--
--  Safe to run more than once. If your profiles table already contains
--  duplicate phone numbers or emails, dedupe them before running the unique
--  indexes at the bottom of section 1.
-- ===========================================================================

-- ===========================================================================
--  1. Columns + unique indexes
-- ===========================================================================
alter table orders   add column if not exists idempotency_key text;
alter table orders   add column if not exists review_requested_at timestamptz;
alter table orders   add column if not exists user_id text references profiles(id) on delete set null;
alter table payments add column if not exists verified_by text;

-- One order per idempotency key (double-submit protection).
create unique index if not exists orders_idempotency_uniq
  on orders (idempotency_key) where idempotency_key is not null;

-- A bKash TrxID can only ever fund one order.
create unique index if not exists payments_trx_uniq
  on payments (upper(trx_id)) where trx_id is not null;

-- Case-insensitive email + last-10-digit phone uniqueness.
create unique index if not exists profiles_email_lower_uniq
  on profiles (lower(email)) where email is not null;
create unique index if not exists profiles_phone_key_uniq
  on profiles (right(regexp_replace(phone, '\D', '', 'g'), 10));

create index if not exists orders_user_idx on orders (user_id, created_at desc);
create index if not exists orders_phone_key_idx
  on orders (right(regexp_replace(phone, '\D', '', 'g'), 10));

alter table reviews alter column is_approved set default false;

-- ===========================================================================
--  2. Referral metadata
-- ===========================================================================
alter table referrals add column if not exists max_uses integer not null default 100;
alter table referrals add column if not exists is_active boolean not null default true;
alter table referrals add column if not exists expires_at timestamptz;
alter table referrals add column if not exists created_at timestamptz not null default now();

create unique index if not exists referrals_code_upper_uniq on referrals (upper(code));

-- ===========================================================================
--  3. Promo / referral usage + phone verification
-- ===========================================================================
create table if not exists promo_uses (
  id         text primary key default ('pu_' || substr(md5(random()::text), 1, 12)),
  code       text not null,
  order_id   text not null unique references orders(id) on delete cascade,
  phone      text not null,
  created_at timestamptz not null default now()
);
create index if not exists promo_uses_code_idx on promo_uses (upper(code));

create table if not exists referral_usage (
  id         text primary key default ('ru_' || substr(md5(random()::text), 1, 12)),
  code       text not null,
  order_id   text not null unique references orders(id) on delete cascade,
  phone      text not null,
  created_at timestamptz not null default now()
);
create index if not exists referral_usage_code_idx on referral_usage (upper(code));
create index if not exists referral_usage_phone_idx on referral_usage (upper(code), phone);

create table if not exists phone_verifications (
  id          text primary key default ('pv_' || substr(md5(random()::text), 1, 12)),
  phone       text not null,
  phone_key   text not null,
  purpose     text not null check (purpose in ('register','reset','claim')),
  code_hash   text not null,
  expires_at  timestamptz not null,
  attempts    integer not null default 0,
  verified_at timestamptz,
  consumed_at timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists phone_verifications_lookup_idx
  on phone_verifications (phone_key, purpose, created_at desc);

-- Claim guest orders by the last 10 digits, ignoring spaces/hyphens/country code.
-- Doing this in SQL avoids `.like('%key')` failing on formatted phone numbers.
create or replace function claim_guest_orders(p_user_id text, p_phone_key text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  updated integer;
begin
  update orders
     set user_id = p_user_id,
         updated_at = now()
   where user_id is null
     and right(regexp_replace(phone, '\D', '', 'g'), 10)
         = right(regexp_replace(p_phone_key, '\D', '', 'g'), 10);
  get diagnostics updated = row_count;
  return updated;
end;
$$;

-- Phone lookups must ignore formatting (`+880 1712-345678` == `01712345678`).
create or replace function find_profile_by_phone_key(p_key text)
returns setof profiles
language sql
stable
security definer
set search_path = public
as $$
  select *
    from profiles
   where right(regexp_replace(phone, '\D', '', 'g'), 10)
       = right(regexp_replace(p_key, '\D', '', 'g'), 10)
   limit 1;
$$;

create or replace function list_orders_by_phone_key(p_key text)
returns setof orders
language sql
stable
security definer
set search_path = public
as $$
  select *
    from orders
   where right(regexp_replace(phone, '\D', '', 'g'), 10)
       = right(regexp_replace(p_key, '\D', '', 'g'), 10)
   order by created_at desc;
$$;

-- ===========================================================================
--  4. Atomic stock RPCs
--     Exceptions (not jsonb failures) are used so a partially reserved order
--     rolls back completely.
-- ===========================================================================
create or replace function reserve_stock(p_items jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  item jsonb;
  c_id text;
  qty  integer;
  updated integer;
begin
  for item in select * from jsonb_array_elements(p_items) loop
    c_id := item->>'cake_id';
    qty  := coalesce((item->>'quantity')::int, 0);

    if c_id is null or qty <= 0 then
      raise exception 'invalid_quantity';
    end if;

    update cakes
       set stock = stock - qty
     where id = c_id
       and is_active = true
       and stock >= qty;
    get diagnostics updated = row_count;

    if updated = 0 then
      if exists (select 1 from cakes where id = c_id) then
        raise exception 'insufficient_stock';
      else
        raise exception 'cake_not_found';
      end if;
    end if;
  end loop;

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function release_stock(p_items jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  item jsonb;
  c_id text;
  qty  integer;
begin
  for item in select * from jsonb_array_elements(p_items) loop
    c_id := item->>'cake_id';
    qty  := coalesce((item->>'quantity')::int, 0);
    if c_id is not null and qty > 0 then
      update cakes set stock = stock + qty where id = c_id;
    end if;
  end loop;
end;
$$;

-- ===========================================================================
--  5. Atomic promo / referral RPCs
-- ===========================================================================
create or replace function consume_promo(p_code text, p_order_id text, p_phone text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_promo promo_codes%rowtype;
begin
  select * into v_promo
    from promo_codes
   where upper(code) = upper(trim(p_code))
   for update;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'কোড পাওয়া যায়নি');
  end if;
  if not v_promo.is_active then
    return jsonb_build_object('ok', false, 'reason', 'এই কোড বন্ধ আছে');
  end if;
  if v_promo.expires_at is not null and v_promo.expires_at < now() then
    return jsonb_build_object('ok', false, 'reason', 'কোডের মেয়াদ শেষ');
  end if;
  if v_promo.usage_limit > 0 and v_promo.used_count >= v_promo.usage_limit then
    return jsonb_build_object('ok', false, 'reason', 'কোডটি সবার কাছে শেষ হয়ে গেছে');
  end if;

  update promo_codes set used_count = used_count + 1 where id = v_promo.id;

  insert into promo_uses (code, order_id, phone)
  values (v_promo.code, p_order_id, p_phone)
  on conflict (order_id) do nothing;

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function release_promo(p_order_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  for r in select code from promo_uses where order_id = p_order_id loop
    update promo_codes
       set used_count = greatest(0, used_count - 1)
     where upper(code) = upper(r.code);
  end loop;
  delete from promo_uses where order_id = p_order_id;
end;
$$;

create or replace function consume_referral(p_code text, p_order_id text, p_phone text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ref referrals%rowtype;
begin
  select * into v_ref
    from referrals
   where upper(code) = upper(trim(p_code))
   for update;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'রেফারেল কোড পাওয়া যায়নি');
  end if;
  if not v_ref.is_active then
    return jsonb_build_object('ok', false, 'reason', 'এই রেফারেল কোড বন্ধ আছে');
  end if;
  if v_ref.expires_at is not null and v_ref.expires_at < now() then
    return jsonb_build_object('ok', false, 'reason', 'রেফারেল কোডের মেয়াদ শেষ');
  end if;
  if v_ref.max_uses > 0 and v_ref.used_count >= v_ref.max_uses then
    return jsonb_build_object('ok', false, 'reason', 'এই রেফারেল কোড আর ব্যবহার করা যাবে না');
  end if;
  if exists (
    select 1 from referral_usage
     where upper(code) = upper(v_ref.code) and phone = p_phone
  ) then
    return jsonb_build_object('ok', false, 'reason', 'এই রেফারেল কোড আপনি আগে ব্যবহার করেছেন');
  end if;

  update referrals set used_count = used_count + 1 where id = v_ref.id;

  insert into referral_usage (code, order_id, phone)
  values (v_ref.code, p_order_id, p_phone)
  on conflict (order_id) do nothing;

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function release_referral(p_order_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  for r in select code from referral_usage where order_id = p_order_id loop
    update referrals
       set used_count = greatest(0, used_count - 1)
     where upper(code) = upper(r.code);
  end loop;
  delete from referral_usage where order_id = p_order_id;
end;
$$;

-- Only the server (service role) may call these privileged RPCs.
revoke execute on function claim_guest_orders(text, text) from public, anon, authenticated;
revoke execute on function find_profile_by_phone_key(text) from public, anon, authenticated;
revoke execute on function list_orders_by_phone_key(text) from public, anon, authenticated;
revoke execute on function reserve_stock(jsonb) from public, anon, authenticated;
revoke execute on function release_stock(jsonb) from public, anon, authenticated;
revoke execute on function consume_promo(text, text, text) from public, anon, authenticated;
revoke execute on function release_promo(text) from public, anon, authenticated;
revoke execute on function consume_referral(text, text, text) from public, anon, authenticated;
revoke execute on function release_referral(text) from public, anon, authenticated;

grant execute on function claim_guest_orders(text, text) to service_role;
grant execute on function find_profile_by_phone_key(text) to service_role;
grant execute on function list_orders_by_phone_key(text) to service_role;
grant execute on function reserve_stock(jsonb) to service_role;
grant execute on function release_stock(jsonb) to service_role;
grant execute on function consume_promo(text, text, text) to service_role;
grant execute on function release_promo(text) to service_role;
grant execute on function consume_referral(text, text, text) to service_role;
grant execute on function release_referral(text) to service_role;

-- ===========================================================================
--  6. RLS for automation tables (service-role only; no anon policies)
-- ===========================================================================
alter table promo_uses          enable row level security;
alter table referral_usage      enable row level security;
alter table phone_verifications enable row level security;
alter table abandoned_carts     enable row level security;
alter table whatsapp_opt_outs   enable row level security;
alter table whatsapp_messages   enable row level security;

-- ===========================================================================
--  Done. Verify:
--    select indexname from pg_indexes where tablename in
--      ('orders','payments','profiles','promo_uses','referral_usage');
-- ===========================================================================
