-- ---------------------------------------------------------------------------
-- PayStation gateway: allow 'paystation' as a payment method.
-- Run once in the Supabase SQL Editor (after supabase/schema.sql).
--
-- Idempotent: re-running drops and re-creates the same two check constraints.
-- ---------------------------------------------------------------------------

do $$
declare
  c record;
begin
  -- orders: any CHECK that mentions payment_method
  for c in
    select conname
      from pg_constraint
     where conrelid = 'orders'::regclass
       and contype = 'c'
       and pg_get_constraintdef(oid) like '%payment_method%'
  loop
    execute format('alter table orders drop constraint %I', c.conname);
  end loop;

  -- payments: any CHECK that mentions method (the status check says 'status')
  for c in
    select conname
      from pg_constraint
     where conrelid = 'payments'::regclass
       and contype = 'c'
       and pg_get_constraintdef(oid) like '%method%'
  loop
    execute format('alter table payments drop constraint %I', c.conname);
  end loop;
end $$;

alter table orders
  add constraint orders_payment_method_check
  check (payment_method in ('cod', 'bkash', 'paystation'));

alter table payments
  add constraint payments_method_check
  check (method in ('cod', 'bkash', 'paystation'));

-- payments.status already allows 'paid' — PayStation settlement marks rows paid.
