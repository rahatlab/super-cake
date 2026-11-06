-- ===========================================================================
--  Admin user controls: block accounts + flag fake orders
--
--  Run this in the Supabase SQL editor (safe to re-run).
--  Run after: schema.sql / missing-columns-migration.sql
--
--  Also run supabase/missing-columns-migration.sql if you have not yet —
--  several columns (birthdate, review_requested_at, idempotency_key, ...) are
--  added there and this file does not duplicate them.
-- ===========================================================================

-- ---------------------------------- profiles ------------------------------
-- Block a customer: they can no longer log in or place an order.
-- (schema.sql already defines it; this exists for databases created before it.)
alter table profiles add column if not exists is_blocked boolean not null default false;

create index if not exists profiles_blocked_idx
  on profiles (is_blocked)
  where is_blocked;

-- ---------------------------------- orders --------------------------------
-- 🚩 Fake/prank order marker, toggled from the admin order detail page.
alter table orders add column if not exists is_flagged boolean not null default false;

create index if not exists orders_flagged_idx
  on orders (is_flagged)
  where is_flagged;

analyze profiles;
analyze orders;
