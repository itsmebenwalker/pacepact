-- Plan generation retry tracking.
--
-- Adds attempt counter + last-attempt timestamp to groups so that:
--   1. Stuck generation (process killed mid-flight) can be auto-retriggered
--      on subsequent page renders without double-running.
--   2. After a fixed number of failed attempts, the group is marked failed
--      and a support-contact email is sent to the creator.

ALTER TABLE groups
  ADD COLUMN IF NOT EXISTS plan_generation_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS plan_generation_last_attempt_at timestamptz,
  -- Persist the inputs for event_type='other' so a retry can rebuild the
  -- exact same prompt without the original API request body.
  ADD COLUMN IF NOT EXISTS other_sport text,
  ADD COLUMN IF NOT EXISTS other_distance_km numeric;

-- Index on (plan_status, plan_generation_last_attempt_at) so the stuck-detection
-- CAS update is cheap even as the table grows.
CREATE INDEX IF NOT EXISTS idx_groups_plan_status_last_attempt
  ON groups (plan_status, plan_generation_last_attempt_at)
  WHERE plan_status = 'generating';
