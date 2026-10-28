# 🎂 Super Cake — Full-Stack Cake Ordering Website

Modern, animated, fully responsive cake ordering site with customer ordering, live order
tracking, admin dashboard (pie charts), promo codes, delivery charge rules, WhatsApp
notifications, blog, SEO and reviews.

Built with **Next.js 16 + TypeScript + Tailwind CSS v4 + Framer Motion**.
Runs out of the box with **zero configuration** — no database account needed to start.

---

## ✨ Features

### Storefront
- Animated hero with falling sprinkles, floating badges, staggered text reveal
- Dark / Light theme with animated toggle (`next-themes`)
- Occasion-first browsing: 🎂 Birthday · 💍 Anniversary · 🎉 Occasion · 🎁 Gift · Others
- Catalog with live search, occasion + category filters, 5 sort options
- Product page: swipe gallery + lightbox zoom, **weight selector (½ / 1 / 2 / 3 lb) with
  live animated price**, related cakes, WhatsApp order button, customer reviews
- **Custom cake order** form with *live message preview* and instant price summary
- **4-step checkout wizard** — Occasion → Cart/Design → Delivery → Payment
- Promo code (admin-set percent), referral code, flat delivery charge with
  **free-delivery rule**, Cash on Delivery + bKash (TrxID) payment
- Order success page with confetti + checkmark animation
- **Order tracking** with animated status timeline
- **Review after delivery** — the form only unlocks once status is `delivered`
- Blog with reading time, share/copy link, JSON-LD
- Account page: profile, order history, quick track/review links
- **Free phone verification** — customers verify with a WhatsApp message
  (`VERIFY-XXXXXX`), so no SMS or paid authentication template is required

### Admin dashboard (`/admin`)
- Overview: 4 stat cards + **Pie charts** (orders by occasion, by payment, promo usage)
  + revenue bar chart (Recharts)
- Orders list with filters + detail page: status controls, bKash verification,
  WhatsApp customer link, full totals breakdown
- Cake manager: multi-image upload, **weight-wise pricing editor**, stock & availability
  toggles, featured flag, delete with confirmation
- Promo code manager with usage progress bars
- Payments verification queue
- Reviews moderation (approve / delete)
- Blog editor (title, excerpt, markdown content, cover, SEO title/description, publish)
- Offer banner editor with countdown
- Settings: store info, **delivery charge + free rule**, payment toggles, social links

### Quality
- **SEO**: metadata API, canonical URLs, `sitemap.xml`, `robots.txt`, OpenGraph + Twitter
  cards, JSON-LD (`Bakery`, `Product`, `AggregateRating`, `BlogPosting`, `BreadcrumbList`,
  `WebSite`), generated `og.png`
- **Security**: scrypt password hashing, HMAC-signed HttpOnly session cookie, middleware
  auth guard via `requireAdmin()`, Zod validation on every server action, **server-side
  price re-calculation** (client totals are never trusted), in-memory rate limiting,
  CSP / HSTS / nosniff / frame-options headers, secrets in `.env.local` only
- **Performance**: AVIF/WebP via `next/image`, lazy galleries, code-split charts,
  `prefers-reduced-motion` respected everywhere

---

## 🚀 Quick start

```bash
npm install
npm run dev
```

Open http://localhost:3000

> Demo mode uses a local JSON store at `.data/db.json` and seeds it automatically.
> Reset demo data with `npm run db:reset`.

**Admin login:** `admin@supercake.com` / `admin1234`
**Demo customer:** `rafiq@example.com` / `demo1234`

*(Change the admin password immediately — Settings → or edit the user in the store.)*

---

## 🗄️ Switching to Supabase (production database)

The app ships with **two interchangeable stores behind one interface**
(`src/lib/store/`). It picks Supabase automatically when both env vars are present.

1. Create a free project at https://supabase.com
2. Open **SQL Editor** and run these migrations **in order**:
   1. `supabase/schema.sql` — tables, policies and seed data
   2. `supabase/whatsapp-automation.sql` — automation tables/columns
   3. `supabase/phase-fixes.sql` — idempotency, stock/promo/referral RPCs,
      phone verification and unique indexes

   > `phase-fixes.sql` creates unique indexes on `lower(email)` and the last 10
   > digits of `profiles.phone`. If the project already has duplicate
   > profiles, dedupe them **before** running that file or the index creation
   > will fail. The rest of the file is safe to re-run.
3. Copy `.env.example` → `.env.local` and fill:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
   ```
4. Restart `npm run dev`
5. Register an account on the site, then promote it:
   ```sql
   update profiles set role = 'admin' where email = 'you@example.com';
   ```

Image uploads go to the Supabase **`cakes`** public bucket and return CDN URLs — no
separate storage service required.

---

## 🔐 Free phone verification (OTP)

Registration, password reset and guest-order claiming need a verified phone number.
There is **no SMS provider and no Firebase Phone Auth**: the customer proves ownership
by sending a short message from their own WhatsApp number, which costs nothing.

How it works:

1. The site issues a random 6-digit code (stored only as an HMAC hash, valid 10 minutes,
   5 attempts) and shows a `wa.me` link.
2. The customer sends `VERIFY-123456` to the store's WhatsApp number.
3. The Meta webhook (`/api/whatsapp/webhook`) matches the sender's number, marks the
   code verified and replies with a confirmation.
4. The site polls the verification status and unlocks the form.

```env
OTP_SECRET=...            # separate 32+ char HMAC key (falls back to AUTH_SECRET)
OTP_DEV_AUTO_VERIFY=false # never true on a real deployment
```

Development convenience: when `NODE_ENV !== "production"` the code is auto-verified
after it is issued and can also be typed into the UI. In production the **webhook is
required**, so configure `WHATSAPP_*` and subscribe to the `messages` field. If WhatsApp
automation is disabled, registration/reset will stay locked — that is intentional.

---

## 📱 WhatsApp automation

Set these in `.env.local`:

```env
WHATSAPP_TOKEN=...          # Meta access token
WHATSAPP_PHONE_ID=...       # Phone number ID
WHATSAPP_FROM_NUMBER=...    # Your business number (digits only)
WHATSAPP_WABA_ID=...        # WhatsApp Business Account ID
WHATSAPP_VERIFY_TOKEN=...   # Random string used by the Meta webhook
WHATSAPP_APP_SECRET=...     # Meta App Dashboard → Settings → Basic
WHATSAPP_TEMPLATES_ENABLED=false
WHATSAPP_TEMPLATE_LANG=bn
WHATSAPP_AUTOMATION_ENABLED=true
CRON_SECRET=...             # Protects /api/cron/abandoned-carts
```

Then run `supabase/whatsapp-automation.sql` and `supabase/phase-fixes.sql` in the
Supabase **SQL Editor** (after `schema.sql`, in that order). The first adds
`orders.review_requested_at`, `whatsapp_messages`, `abandoned_carts` and
`whatsapp_opt_outs`; the second adds phone verification, idempotency and the
atomic stock/promo/referral functions.

What runs automatically:

- **New order** → admin alert + customer confirmation
- **Status change** (`confirmed`, `baking`, `out_for_delivery`, `delivered`, `completed`, `cancelled`) → customer update
- **Delivered/completed** → one-time review request (tracked by `review_requested_at`)
- **Customer WhatsApp reply** → menu / order status / contact auto-reply via the webhook
- **`VERIFY-XXXXXX`** → free phone verification for registration/password reset/guest claim
- **`START` / `STOP`** → abandoned-cart reminder opt-in / opt-out
- **Abandoned checkout** → opt-in reminder via the daily Vercel cron

Meta only delivers business-initiated messages outside the 24-hour customer-service
window with an **approved template**. Create the five templates once the WABA is healthy:

```bash
npm run wa:health            # diagnose ban / payment / verification / display name
npm run wa:templates         # check template status
npm run wa:templates:create  # create missing templates (language: bn)
```

Then set `WHATSAPP_TEMPLATES_ENABLED=true` and restart. Until then the app falls back to
free-form text, which only works inside the 24h window or for Meta test recipients.

**Meta webhook:** App Dashboard → WhatsApp → Configuration → Callback URL
`https://yourdomain.com/api/whatsapp/webhook`, verify token = `WHATSAPP_VERIFY_TOKEN`,
and subscribe to the `messages` field. Set `WHATSAPP_APP_SECRET` so POST signatures are
verified (required in production).

**Cron:** `vercel.json` runs `/api/cron/abandoned-carts` daily at 06:00 UTC (Hobby plan
allows one run per day). Vercel automatically sends `Authorization: Bearer $CRON_SECRET`.

---

## ⚙️ Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | ✅ | Canonical URL used in metadata, sitemap, JSON-LD |
| `AUTH_SECRET` | ✅ | Signs the session cookie (32+ random characters) |
| `OTP_SECRET` | recommended | HMAC key for phone OTP hashes (falls back to `AUTH_SECRET`) |
| `OTP_DEV_AUTO_VERIFY` | optional | Auto-verify/typed-code shortcut for local demos (never in production) |
| `ALLOW_LOCAL_STORE` | optional | Allow the JSON store under `NODE_ENV=production` (local previews only) |
| `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | optional | Enable PostgreSQL + Storage |
| `WHATSAPP_TOKEN` / `WHATSAPP_PHONE_ID` / `WHATSAPP_FROM_NUMBER` | optional | Cloud API sending + OTP webhook |
| `WHATSAPP_WABA_ID` / `WHATSAPP_VERIFY_TOKEN` / `WHATSAPP_APP_SECRET` | optional | Templates + webhook |
| `WHATSAPP_TEMPLATES_ENABLED` / `WHATSAPP_TEMPLATE_LANG` | optional | Template sending (enable after approval) |
| `WHATSAPP_AUTOMATION_ENABLED` | optional | Master switch for automatic sends |
| `CRON_SECRET` | optional | Bearer token for the abandoned-cart cron |

---

## 🧱 Project structure

```
src/
├─ app/
│  ├─ (site)/            # public pages (header + footer wrapper)
│  │  ├─ page.tsx        # home
│  │  ├─ cakes/          # catalog + [slug] detail
│  │  ├─ order/          # 4-step wizard + success
│  │  ├─ custom-order/   # custom cake form
│  │  ├─ track/          # order tracking
│  │  ├─ review/[orderId]
│  │  ├─ blog/           # list + [slug]
│  │  └─ login | register | account
│  ├─ admin/             # protected dashboard
│  ├─ api/               # WhatsApp webhook + cart lead + abandoned-cart cron
│  ├─ sitemap.ts robots.ts not-found.tsx
│  └─ layout.tsx globals.css
├─ components/           # UI, cart, order wizard, admin, charts
└─ lib/
   ├─ actions/           # server actions (auth, order, admin)
   ├─ store/             # Store interface + local + supabase impls
   ├─ auth.ts password.ts validators.ts pricing.ts whatsapp.ts seo.ts
   └─ types.ts constants.ts utils.ts upload.ts rate-limit.ts
```

---

## 📦 Useful scripts

| Command | What it does |
|---|---|
| `npm run dev` | dev server |
| `npm run build` | production build |
| `npm run lint` | eslint |
| `npm run typecheck` | TypeScript, no emit |
| `npm test` | pricing/utils unit tests (Node test runner) |
| `npm run gen:images` | regenerate placeholder cake artwork |
| `npm run gen:og` | regenerate the social share image (`og.png`) |
| `npm run wa:health` | WhatsApp phone/WABA/template health check |
| `npm run wa:templates` | list Super Cake template status |
| `npm run wa:templates:create` | create missing templates in Meta |
| `npm run db:reset` | wipe demo data and reseed |

---

## 🌐 Deploy (free, only your domain is paid)

1. Push this repo to GitHub
2. Import it on **vercel.com** (Hobby = free)
3. Set the environment variables above in *Project → Settings → Environment Variables*
4. Add your **domain** in *Domains* → point the nameservers to Vercel
   (SSL is issued automatically, free)
5. In `.env.local`/Vercel set `NEXT_PUBLIC_SITE_URL=https://yourdomain.com`

Everything else (build, hosting, bandwidth, SSL, storage) stays on the free tier.

---

## 🔐 Production checklist

- [ ] Change the admin password from `admin1234`
- [ ] Rotate the WhatsApp access token in Meta Business Suite
- [ ] Set a strong unique `AUTH_SECRET` and a separate `OTP_SECRET`
- [ ] Set `NEXT_PUBLIC_SITE_URL` to your real domain
- [ ] Run `schema.sql` → `whatsapp-automation.sql` → `phase-fixes.sql`, dedupe
      profile emails/phones first, then switch off demo mode
- [ ] Keep `OTP_DEV_AUTO_VERIFY=false` and `ALLOW_LOCAL_STORE` unset
- [ ] Set `WHATSAPP_APP_SECRET`, configure the Meta webhook, and verify GET/POST
      (including a real `VERIFY-XXXXXX` reply before launch)
- [ ] Create + approve WhatsApp templates, then set `WHATSAPP_TEMPLATES_ENABLED=true`
- [ ] Set `CRON_SECRET` in Vercel and confirm the cron run
- [ ] Replace placeholder cake images with real photos (admin → Cakes → upload)
- [ ] Set your real bKash number + delivery charge in **Settings**
