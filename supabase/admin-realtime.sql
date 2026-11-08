-- ===========================================================================
--  Realtime admin dashboard badges
--
--  Run this in the Supabase SQL editor (safe to re-run).
--
--  The admin sidebar polls /api/admin/badges every 20s for its counts
--  (unread notifications, pending reviews / payments / orders). This adds a
--  tiny, PII-free event table + triggers so any change to reviews, orders
--  or notifications emits a realtime INSERT the dashboard listens to —
--  counts and toasts update in ~1s instead of up to 20s. The 20s poll stays
--  as a fallback, so nothing breaks if this migration hasn't run yet.
-- ===========================================================================

create table if not exists admin_events (
  id         text primary key default ('ae_' || substr(md5(random()::text), 1, 10)),
  kind       text not null check (kind in ('review', 'order', 'payment', 'notification')),
  created_at timestamptz not null default now()
);

create index if not exists admin_events_created_at_idx on admin_events (created_at desc);

-- Only the event kind + timestamp are stored — no customer data — so it is
-- safe to read with the public anon key (same pattern as order_tracking).
alter table admin_events enable row level security;

drop policy if exists "admin_events public read" on admin_events;
create policy "admin_events public read"
  on admin_events for select
  using (true);

grant select on admin_events to anon, authenticated;

-- ---------------------------------------------------------------------------
--  Triggers: any insert/update/delete on the badge source tables emits an
--  event. SECURITY DEFINER so it keeps working regardless of the caller's
--  grants; the function only ever writes kind + timestamp.
-- ---------------------------------------------------------------------------
create or replace function log_admin_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_kind text;
begin
  if TG_TABLE_NAME = 'orders' then
    -- A payment_status flip is what moves the Payments badge.
    if TG_OP = 'UPDATE' and new.payment_status is distinct from old.payment_status then
      v_kind := 'payment';
    else
      v_kind := 'order';
    end if;
  elsif TG_TABLE_NAME = 'reviews' then
    v_kind := 'review';
  elsif TG_TABLE_NAME = 'notifications' then
    v_kind := 'notification';
  else
    v_kind := TG_TABLE_NAME;
  end if;

  insert into admin_events (kind) values (v_kind);

  -- Keep the table tiny — events are only a "refetch" signal.
  delete from admin_events where created_at < now() - interval '7 days';

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_admin_event_reviews on reviews;
create trigger trg_admin_event_reviews
  after insert or update or delete on reviews
  for each row execute function log_admin_event();

drop trigger if exists trg_admin_event_orders on orders;
create trigger trg_admin_event_orders
  after insert or update or delete on orders
  for each row execute function log_admin_event();

drop trigger if exists trg_admin_event_notifications on notifications;
create trigger trg_admin_event_notifications
  after insert or update or delete on notifications
  for each row execute function log_admin_event();

-- ---------------------------------------------------------------------------
--  Realtime
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'admin_events'
  ) then
    execute 'alter publication supabase_realtime add table public.admin_events';
  end if;
end $$;

analyze admin_events;
