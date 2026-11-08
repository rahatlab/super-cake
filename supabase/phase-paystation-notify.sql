-- PayStation confirmation gating: track when the admin/customer WhatsApp
-- confirmation has been sent so it fires exactly once, only after payment.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS confirmation_sent_at timestamptz;
CREATE INDEX IF NOT EXISTS orders_confirmation_sent_at_idx ON orders (confirmation_sent_at);
