-- ===========================================================================
--  Realtime order tracking + status timeline + review photos
--
--  Run this in the Supabase SQL editor (safe to re-run).
--  Order of operations: reviews column -> history -> tracking table/trigger.
-- ===========================================================================

-- ---------------------------------------------------------------------------
--  1. Review photos (Cloudinary secure URLs)
-- ---------------------------------------------------------------------------
alter table reviews add column if not exists photos text[] not null default '{}';

-- ---------------------------------------------------------------------------
--  2. Order status timeline
--     Rows are appended by the app (store.updateOrder) on every real status
--     transition, so the customer timeline can show real timestamps.
-- ---------------------------------------------------------------------------
create table if not exists order_status_history (
  id         text primary key default ('osh_' || substr(md5(random()::text), 1, 10)),
  order_id   text not null references orders(id) on delete cascade,
  status     text not null
             check (status in ('pending','confirmed','baking','out_for_delivery','delivered','completed','cancelled')),
  note       text,
  created_at timestamptz not null default now()
);

create index if not exists order_status_history_order_idx
  on order_status_history (order_id, created_at);

-- Legacy orders get a "pending" row so the timeline has a start time.
insert into order_status_history (order_id, status, created_at)
select o.id, 'pending', o.created_at
from orders o
where not exists (
  select 1 from order_status_history h where h.order_id = o.id
);

-- ---------------------------------------------------------------------------
--  3. Public tracking table (Realtime source)
--     Deliberately contains status only — no name, phone, address or items.
-- ---------------------------------------------------------------------------
create table if not exists order_tracking (
  order_id       text primary key references orders(id) on delete cascade,
  order_status   text not null,
  payment_status text not null,
  updated_at     timestamptz not null default now()
);

create or replace function sync_order_tracking()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into order_tracking (order_id, order_status, payment_status, updated_at)
  values (new.id, new.order_status, new.payment_status, coalesce(new.updated_at, now()))
  on conflict (order_id) do update
    set order_status   = excluded.order_status,
        payment_status = excluded.payment_status,
        updated_at     = excluded.updated_at;
  return new;
end;
$$;

drop trigger if exists orders_sync_tracking on orders;
create trigger orders_sync_tracking
after insert or update of order_status, payment_status on orders
for each row execute function sync_order_tracking();

-- Backfill existing orders.
insert into order_tracking (order_id, order_status, payment_status, updated_at)
select id, order_status, payment_status, coalesce(updated_at, created_at)
from orders
on conflict (order_id) do nothing;

-- Row level security: anyone may read, nobody may write with the anon key
-- (the trigger is the only writer).
alter table order_tracking enable row level security;

drop policy if exists "order_tracking public read" on order_tracking;
create policy "order_tracking public read"
  on order_tracking for select
  using (true);

grant select on order_tracking to anon, authenticated;

-- ---------------------------------------------------------------------------
--  4. Enable Realtime for the tracking table
-- ---------------------------------------------------------------------------
-- REPLICA IDENTITY FULL is required: an UPDATE payload otherwise only contains
-- the primary key and the changed columns, so a payment-only change would not
-- carry order_status.
alter table order_tracking replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'order_tracking'
  ) then
    execute 'alter publication supabase_realtime add table public.order_tracking';
  end if;
end $$;

analyze order_status_history;
analyze order_tracking;
