-- Phase: admin dashboard notification sound volume (0-100)
alter table settings add column if not exists notification_sound_volume integer not null default 50;
