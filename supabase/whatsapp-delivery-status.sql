-- ===========================================================================
--  Super Cake — WhatsApp delivery receipts + admin message log
--  Run this in: Supabase Dashboard -> SQL Editor -> New query -> Run
--  (Run AFTER whatsapp-automation.sql)
-- ===========================================================================

-- Meta's `statuses` webhook echoes the wamid of the message we sent. Storing
-- it is what lets a later delivered/read/failed callback find the right row.
alter table whatsapp_messages add column if not exists meta_message_id text;

create index if not exists whatsapp_messages_meta_idx
  on whatsapp_messages (meta_message_id)
  where meta_message_id is not null;

-- Widen the status vocabulary: we now persist the full lifecycle instead of
-- only "sent"/"failed" as it looked at send time.
alter table whatsapp_messages drop constraint if exists whatsapp_messages_status_check;
alter table whatsapp_messages add constraint whatsapp_messages_status_check
  check (status in ('sent', 'delivered', 'read', 'failed', 'skipped'));

-- The admin log reads newest-first, optionally filtered by status.
create index if not exists whatsapp_messages_status_idx
  on whatsapp_messages (status, created_at desc);
