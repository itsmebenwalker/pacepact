-- Background plan generation: plan_status column, updated notifications constraint, groups Realtime

-- 1. Add plan_status to groups (existing groups default to 'ready')
ALTER TABLE groups
  ADD COLUMN IF NOT EXISTS plan_status text NOT NULL DEFAULT 'ready';

-- 2. Extend notifications type check to include 'plan_ready'
--    The inline CHECK on CREATE TABLE gets a Postgres auto-generated name.
--    This DO block finds and drops it regardless of the generated name.
DO $$
DECLARE
  v_cname text;
BEGIN
  SELECT con.conname INTO v_cname
    FROM pg_constraint con
    JOIN pg_class     rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
   WHERE nsp.nspname = 'public'
     AND rel.relname = 'notifications'
     AND con.contype = 'c'
     AND pg_get_constraintdef(con.oid) LIKE '%type%';

  IF v_cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE notifications DROP CONSTRAINT %I', v_cname);
  END IF;
END $$;

ALTER TABLE notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('message_admin', 'message_any', 'activity_matched', 'plan_ready'));

-- 3. Enable Supabase Realtime on groups so the generating banner can subscribe
ALTER PUBLICATION supabase_realtime ADD TABLE groups;
