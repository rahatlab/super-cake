-- ===========================================================================
--  Performance indexes for the read paths the app actually uses.
--
--  Safe to re-run: every statement is `if not exists`. Run this after
--  schema.sql / phase-fixes.sql in the Supabase SQL editor.
--  (Indexes that already exist in those files are intentionally not repeated.)
-- ===========================================================================

-- Storefront catalog: "approved reviews by cake", newest first.
create index if not exists reviews_approved_created_idx
  on reviews (is_approved, created_at desc);
create index if not exists reviews_cake_slug_idx
  on reviews (cake_slug, created_at desc) where cake_slug is not null;

-- Blog list / detail: published-only listing, newest first.
create index if not exists blog_posts_published_created_idx
  on blog_posts (is_published, created_at desc);

-- Admin dashboard aggregates scan the whole orders table; the composite helps
-- the pending/delivered counts, and a plain created_at index already exists.
create index if not exists orders_status_created_idx
  on orders (order_status, created_at desc);

-- Payments: newest-first admin list (order_id and trx_id already indexed).
create index if not exists payments_created_idx
  on payments (created_at desc);

-- Promo lookup uses ilike(code) — a plain unique index on `code` can't serve
-- case-insensitive matching, an expression index can.
create index if not exists promo_codes_upper_code_idx
  on promo_codes (upper(code));
create index if not exists referrals_upper_code_idx
  on referrals (upper(code));

-- Banners: only the active one is read on the homepage.
create index if not exists banners_active_idx
  on banners (is_active);

-- Notifications: admin list is ordered by created_at desc (existing index is
-- only on is_read).
create index if not exists notifications_created_idx
  on notifications (created_at desc);

-- Refresh planner statistics once the indexes are in place.
analyze orders;
analyze payments;
analyze reviews;
analyze blog_posts;
analyze promo_codes;
analyze banners;
analyze notifications;
