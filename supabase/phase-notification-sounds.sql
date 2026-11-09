-- Phase: per-type notification sound overrides (file URL + toggle + volume)
-- NOTE: admin sound uploads reuse the existing public "cakes" bucket (sounds/ prefix).
alter table settings add column if not exists notification_sounds jsonb not null default
  '{"order":{"enabled":true,"volume":50,"url":null},"payment":{"enabled":true,"volume":50,"url":null},"review":{"enabled":true,"volume":50,"url":null}}'::jsonb;
