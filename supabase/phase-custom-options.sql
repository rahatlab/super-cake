-- Phase: custom cake option toggles + design image (custom_spec JSON, no column needed for image)
-- Run in Supabase SQL editor.

alter table settings add column if not exists custom_options jsonb not null default
  '{"tiers":true,"shape":true,"finish":true,"crown":true,"syrup":true,"message":true,"font":true,"message_color":true}'::jsonb;
