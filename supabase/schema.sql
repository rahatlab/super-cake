-- ===========================================================================
--  Super Cake — Supabase (PostgreSQL) schema
--  Run this in:  Supabase Dashboard -> SQL Editor -> New query -> Run
--
--  After running it:
--    1. Start the site and register a normal account.
--    2. Promote yourself to admin:
--         update profiles set role = 'admin' where email = 'you@example.com';
--    3. Fill NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local
-- ===========================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------- profiles ------------------------------
create table if not exists profiles (
  id            text primary key default ('u_' || substr(md5(random()::text), 1, 10)),
  name          text not null,
  phone         text not null,
  email         text unique,
  role          text not null default 'customer' check (role in ('customer','admin')),
  password_hash text not null,
  created_at    timestamptz not null default now()
);

-- ---------------------------------- cakes ---------------------------------
create table if not exists cakes (
  id                  text primary key default ('cake_' || substr(md5(random()::text), 1, 10)),
  name                text not null,
  slug                text not null unique,
  description         text not null default '',
  flavor              text not null default '',
  category            text not null default '',
  occasions           jsonb not null default '[]'::jsonb,
  image_urls          jsonb not null default '[]'::jsonb,
  base_price          integer not null default 0,
  is_custom_available boolean not null default false,
  is_featured         boolean not null default false,
  is_active           boolean not null default true,
  stock               integer not null default 10,
  created_at          timestamptz not null default now()
);
create index if not exists cakes_active_idx on cakes (is_active);
create index if not exists cakes_slug_idx on cakes (slug);

create table if not exists cake_sizes (
  id           text primary key default ('size_' || substr(md5(random()::text), 1, 10)),
  cake_id      text not null references cakes(id) on delete cascade,
  weight       numeric not null,
  price        integer not null,
  is_available boolean not null default true
);
create index if not exists cake_sizes_cake_idx on cake_sizes (cake_id);

-- --------------------------------- orders ---------------------------------
create table if not exists orders (
  id                text primary key default ('ord_' || substr(md5(random()::text), 1, 12)),
  order_no          text not null unique,
  user_id           text references profiles(id) on delete set null,
  customer_name     text not null,
  phone             text not null,
  email             text,
  occasion          text not null check (occasion in ('birthday','anniversary','occasion','gift','others')),
  items             jsonb not null default '[]'::jsonb,
  custom_spec       jsonb,
  address           text not null,
  delivery_date     text not null,
  delivery_slot     text,
  subtotal          integer not null default 0,
  promo_code        text,
  discount_amount   integer not null default 0,
  referral_code     text,
  referral_discount integer not null default 0,
  delivery_charge   integer not null default 0,
  total             integer not null default 0,
  payment_method    text not null default 'cod' check (payment_method in ('cod','bkash')),
  payment_status    text not null default 'unpaid' check (payment_status in ('unpaid','pending_verify','paid','refunded')),
  bkash_trx_id      text,
  order_status      text not null default 'pending'
                    check (order_status in ('pending','confirmed','baking','out_for_delivery','delivered','completed','cancelled')),
  note              text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists orders_created_idx on orders (created_at desc);
create index if not exists orders_status_idx on orders (order_status);
create index if not exists orders_phone_idx on orders (phone);

-- -------------------------------- payments --------------------------------
create table if not exists payments (
  id          text primary key default ('pay_' || substr(md5(random()::text), 1, 12)),
  order_id    text not null references orders(id) on delete cascade,
  method      text not null check (method in ('cod','bkash')),
  amount      integer not null default 0,
  trx_id      text,
  status      text not null default 'pending_verify'
              check (status in ('unpaid','pending_verify','paid','refunded')),
  verified_by text,
  created_at  timestamptz not null default now()
);
create index if not exists payments_order_idx on payments (order_id);

-- ------------------------------- promo codes ------------------------------
create table if not exists promo_codes (
  id           text primary key default ('promo_' || substr(md5(random()::text), 1, 10)),
  code         text not null unique,
  percent      integer not null check (percent between 1 and 100),
  min_order    integer not null default 0,
  max_discount integer not null default 0,
  usage_limit  integer not null default 100,
  used_count   integer not null default 0,
  expires_at   timestamptz,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);

-- --------------------------------- reviews --------------------------------
create table if not exists reviews (
  id            text primary key default ('rev_' || substr(md5(random()::text), 1, 10)),
  order_id      text not null references orders(id) on delete cascade,
  customer_name text not null,
  rating        integer not null check (rating between 1 and 5),
  comment       text not null,
  cake_slug     text,
  is_approved   boolean not null default true,
  created_at    timestamptz not null default now()
);
create unique index if not exists reviews_order_uniq on reviews (order_id);

-- ------------------------------- blog posts -------------------------------
create table if not exists blog_posts (
  id               text primary key default ('post_' || substr(md5(random()::text), 1, 10)),
  title            text not null,
  slug             text not null unique,
  excerpt          text not null default '',
  content          text not null default '',
  cover_image      text,
  meta_title       text,
  meta_description text,
  is_published     boolean not null default false,
  published_at     timestamptz,
  created_at       timestamptz not null default now()
);

-- --------------------------------- banners --------------------------------
create table if not exists banners (
  id        text primary key default ('banner_' || substr(md5(random()::text), 1, 10)),
  title     text not null,
  subtitle  text,
  cta_text  text,
  cta_link  text,
  ends_at   timestamptz,
  is_active boolean not null default true
);

-- ------------------------------- notifications ----------------------------
create table if not exists notifications (
  id         text primary key default ('noti_' || substr(md5(random()::text), 1, 10)),
  user_id    text,
  type       text not null default 'system' check (type in ('order','payment','review','system')),
  title      text not null,
  message    text not null default '',
  is_read    boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_read_idx on notifications (is_read);

-- --------------------------------- settings -------------------------------
create table if not exists settings (
  id                    integer primary key default 1 check (id = 1),
  store_name            text not null default 'Super Cake',
  tagline               text not null default 'Custom Cakes for Every Celebration',
  phone                 text not null default '+880 1700-000000',
  whatsapp_phone        text not null default '8801700000000',
  email                 text not null default 'hello@supercake.com',
  address               text not null default 'Dhaka, Bangladesh',
  bkash_number          text not null default '01700-000000',
  delivery_charge       integer not null default 80,
  free_delivery_min     integer not null default 2000,
  free_delivery_enabled boolean not null default false,
  cod_enabled           boolean not null default true,
  bkash_enabled         boolean not null default true,
  instagram             text,
  facebook              text
);

insert into settings (id) values (1) on conflict (id) do nothing;

-- ------------------------- referral codes (optional) ----------------------
create table if not exists referrals (
  id         text primary key default ('ref_' || substr(md5(random()::text), 1, 10)),
  code       text not null unique,
  owner_id   text references profiles(id) on delete cascade,
  used_count integer not null default 0
);

-- ===========================================================================
--  Security: the app talks to the database with the SERVICE ROLE key only
--  (server side). Anon/public clients get read-only access to published data.
-- ===========================================================================
alter table profiles       enable row level security;
alter table cakes          enable row level security;
alter table cake_sizes     enable row level security;
alter table orders         enable row level security;
alter table payments       enable row level security;
alter table promo_codes    enable row level security;
alter table reviews        enable row level security;
alter table blog_posts     enable row level security;
alter table banners        enable row level security;
alter table notifications  enable row level security;
alter table settings       enable row level security;
alter table referrals      enable row level security;

-- public read of published catalogue content (never orders/credentials)
create policy "public read cakes"   on cakes          for select using (is_active = true);
create policy "public read sizes"   on cake_sizes     for select using (true);
create policy "public read posts"   on blog_posts     for select using (is_published = true);
create policy "public read banners" on banners        for select using (is_active = true);
create policy "public read reviews" on reviews        for select using (is_approved = true);
create policy "public read settings" on settings      for select using (true);
create policy "public read promos"  on promo_codes    for select using (is_active = true);

-- everything else: no anon access (service role bypasses RLS entirely)

-- ===========================================================================
--  Storage: public bucket for cake images
-- ===========================================================================
insert into storage.buckets (id, name, public)
values ('cakes', 'cakes', true)
on conflict (id) do nothing;

create policy "public read cake images"
  on storage.objects for select
  using (bucket_id = 'cakes');

create policy "service role uploads cake images"
  on storage.objects for insert
  to service_role
  with check (bucket_id = 'cakes');

-- ===========================================================================
--  OPTIONAL demo data — uncomment to start with a few products
-- ===========================================================================
-- insert into cakes (name, slug, description, flavor, category, occasions,
--                    image_urls, base_price, is_featured, stock) values
-- ('Chocolate Truffle Delight','chocolate-truffle-delight',
--  'Rich Belgian chocolate truffle layered with dark ganache.',
--  'Chocolate Truffle','Chocolate','["birthday","anniversary","gift"]',
--  '["/cakes/chocolate-truffle-1.svg"]',1500,true,12)
-- on conflict (slug) do nothing;
