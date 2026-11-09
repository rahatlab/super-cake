-- Phase: admin dashboard notification sound toggle
alter table settings add column if not exists notification_sound_enabled boolean not null default true;
