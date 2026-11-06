-- ===========================================================================
--  Super Cake - Missing Columns Migration
--  Run this to add all missing columns found in the codebase
--  Run after: schema.sql
--  Last updated: 2026-11-04
-- ===========================================================================

-- ---------------------------------- profiles ------------------------------
-- Customer milestone columns (birthdate, anniversary for auto-wishes)
alter table profiles add column if not exists birthdate date;
alter table profiles add column if not exists anniversary_date date;
alter table profiles add column if not exists last_birthday_wish date;
alter table profiles add column if not exists last_anniversary_wish date;
alter table profiles add column if not exists is_blocked boolean not null default false;

-- Indexes for milestone queries
create index if not exists profiles_birthday_idx
  on profiles (birthdate)
  where birthdate is not null;

create index if not exists profiles_anniversary_idx
  on profiles (anniversary_date)
  where anniversary_date is not null;

-- ---------------------------------- orders --------------------------------
-- Review request tracking (when review reminder was sent)
alter table orders add column if not exists review_requested_at timestamptz;

-- Idempotency key for preventing duplicate orders
alter table orders add column if not exists idempotency_key text;

create index if not exists orders_idempotency_key_idx
  on orders (idempotency_key)
  where idempotency_key is not null;

-- ---------------------------------- settings ------------------------------
-- Custom cake pricing columns
alter table settings add column if not exists extra_tier_fee integer not null default 300;
alter table settings add column if not exists syrup_prices jsonb not null default '{"none":0,"vanilla":100,"chocolate":120,"strawberry":120,"coffee":130,"honey":150,"rose":140}'::jsonb;
alter table settings add column if not exists crown_prices jsonb not null default '{"none":0,"sprinkles":150,"pearls":250,"macarons":450,"flowers":550}'::jsonb;

-- ---------------------------------- referrals ------------------------------
-- Referral code limits and expiry
alter table referrals add column if not exists max_uses integer not null default 100;
alter table referrals add column if not exists is_active boolean not null default true;
alter table referrals add column if not exists expires_at timestamptz;
alter table referrals add column if not exists created_at timestamptz not null default now();

-- ===========================================================================
--  Done! All missing columns have been added.
-- ===========================================================================
