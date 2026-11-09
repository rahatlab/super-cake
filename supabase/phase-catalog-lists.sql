-- Phase: admin-managed cake categories & flavours + invoice tracking
-- Run in Supabase SQL editor.

create table if not exists cake_categories (
  id          text primary key default ('cat_' || substr(md5(random()::text), 1, 10)),
  name        text not null unique,
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create table if not exists cake_flavours (
  id          text primary key default ('flv_' || substr(md5(random()::text), 1, 10)),
  name        text not null unique,
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Seed from the old hardcoded constants so nothing disappears.
insert into cake_categories (name, sort_order) values
  ('Chocolate',1),('Vanilla',2),('Red Velvet',3),('Black Forest',4),
  ('Fruit',5),('Cheesecake',6),('Cup Cake',7),('Custom',8)
on conflict (name) do nothing;

insert into cake_flavours (name, sort_order) values
  ('Chocolate Truffle',1),('Vanilla Cream',2),('Red Velvet',3),('Butterscotch',4),
  ('Oreo',5),('Strawberry',6),('Pineapple',7),('Mango',8)
on conflict (name) do nothing;

alter table cake_categories enable row level security;
alter table cake_flavours enable row level security;

-- Stamp for "invoice link sent on WhatsApp" (completed orders).
alter table orders add column if not exists invoice_sent_at timestamptz;
