-- ===========================================================================
--  Super Cake — WhatsApp automation additions
--  Run this in: Supabase Dashboard -> SQL Editor -> New query -> Run
--  (Run AFTER supabase/schema.sql)
-- ===========================================================================

-- Review request idempotency
alter table orders add column if not exists review_requested_at timestamptz;

-- Outbound WhatsApp message log (for debugging + duplicate protection)
create table if not exists whatsapp_messages (
  id            text primary key default ('wam_' || substr(md5(random()::text), 1, 12)),
  order_id      text references orders(id) on delete set null,
  cart_id       text,
  type          text not null,
  template_name text,
  to_phone      text not null,
  status        text not null default 'sent' check (status in ('sent','failed','skipped')),
  detail        text,
  created_at    timestamptz not null default now()
);
create index if not exists whatsapp_messages_order_idx on whatsapp_messages (order_id, type);
create index if not exists whatsapp_messages_created_idx on whatsapp_messages (created_at desc);

-- Abandoned checkout leads
create table if not exists abandoned_carts (
  id                 text primary key default ('cart_' || substr(md5(random()::text), 1, 12)),
  phone              text not null,
  customer_name      text,
  items              jsonb not null default '[]'::jsonb,
  subtotal           integer not null default 0,
  last_activity      timestamptz not null default now(),
  reminded_at        timestamptz,
  converted_order_id text references orders(id) on delete set null,
  opted_in           boolean not null default false,
  created_at         timestamptz not null default now()
);
create unique index if not exists abandoned_carts_phone_uniq on abandoned_carts (phone);
create index if not exists abandoned_carts_activity_idx on abandoned_carts (last_activity);

-- Customers who replied STOP / unsubscribe
create table if not exists whatsapp_opt_outs (
  phone      text primary key,
  reason     text,
  created_at timestamptz not null default now()
);
