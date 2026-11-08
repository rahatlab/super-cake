-- Cake image fit: show the full cake by default instead of cropping.
-- Run manually in the Supabase SQL editor before deploy (same pattern as
-- phase-paystation-notify.sql). DB defaults mean existing rows render
-- full-visible without a backfill.
ALTER TABLE cakes ADD COLUMN IF NOT EXISTS image_fit text DEFAULT 'contain';
ALTER TABLE cakes ADD COLUMN IF NOT EXISTS image_position text DEFAULT 'center';
