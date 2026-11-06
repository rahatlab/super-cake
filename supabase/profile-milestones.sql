-- ===========================================================================
--  Super Cake — customer milestones for the daily auto-wish cron
--  Run this in: Supabase Dashboard -> SQL Editor -> New query -> Run
--  (Run AFTER schema.sql / whatsapp-automation.sql)
-- ===========================================================================

-- /account lets a customer save these; the cron at 06:00 UTC reads them and
-- sends the greeting with a promo code on the matching day.
-- Only month + day matter — the year is a birth / wedding year.
alter table profiles add column if not exists birthdate date;
alter table profiles add column if not exists anniversary_date date;

-- "Already greeted this year" stamps. Written *before* the send, so a crash
-- mid-batch never repeats the same wish on the same day.
alter table profiles add column if not exists last_birthday_wish date;
alter table profiles add column if not exists last_anniversary_wish date;

-- The cron matches on month+day and skips stamped rows; these partial indexes
-- keep that scan cheap once the customer list grows.
create index if not exists profiles_birthday_idx
  on profiles (birthdate)
  where birthdate is not null;

create index if not exists profiles_anniversary_idx
  on profiles (anniversary_date)
  where anniversary_date is not null;
