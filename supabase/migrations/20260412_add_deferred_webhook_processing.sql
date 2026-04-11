-- Deferred webhook processing + brick activity detection
--
-- Strava splits Garmin multisport (brick) workouts into separate activities
-- that all share the same owner_id and event_time. By deferring processing
-- for 30 seconds, all legs arrive before any matching logic runs, and a
-- cron job can group them into a single batch.
--
-- This supersedes the brick_activity_parts approach from the previous migration.

-- Drop brick_activity_parts if it was already applied
drop table if exists brick_activity_parts;
drop index if exists brick_activity_parts_lookup;

-- Add deferred processing timestamp to webhook events
alter table strava_webhook_events
  add column if not exists process_after timestamptz not null
    default (now() + interval '30 seconds');

-- Partial index to make the cron query fast: only unprocessed + due rows
create index if not exists strava_webhook_events_due
  on strava_webhook_events (process_after)
  where processed = false;

-- ============================================================
-- Cron setup (run after applying this migration)
-- ============================================================
--
-- Option A — Supabase pg_cron + pg_net (requires pg_net extension):
--
--   select cron.schedule(
--     'process-strava-webhooks',
--     '* * * * *',
--     $$
--       select net.http_post(
--         url    := 'https://your-app.railway.app/api/strava/process-webhooks',
--         body   := '{}'::jsonb,
--         headers := jsonb_build_object('Authorization', 'Bearer YOUR_CRON_SECRET')
--       )
--     $$
--   );
--
-- Option B — Railway cron service:
--   Add a cron service in the Railway dashboard that POSTs to
--   https://your-app.railway.app/api/strava/process-webhooks
--   every minute with header: Authorization: Bearer YOUR_CRON_SECRET
--
-- Set CRON_SECRET in your Railway environment variables to any strong random string.
-- ============================================================
