-- Drop and recreate brick_activity_parts with the full final schema.
--
-- Replaces the incremental additions from:
--   20260411_add_brick_activity_parts.sql
--   20260412_extend_brick_activity_parts.sql
--   20260413_brick_activity_parts_ui.sql
--
-- Safe to run on any install: existing rows are intentionally discarded
-- (parked legs are transient — they resolve within seconds on a real device).

drop table if exists brick_activity_parts;

create table brick_activity_parts (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        references profiles(id) on delete cascade not null,
  group_id      uuid        references groups(id)   on delete cascade not null,
  external_id   text        not null,
  activity_type text        not null,         -- 'run' | 'ride'
  strava_activity_id bigint,
  activity_name text,
  activity_date text,                         -- YYYY-MM-DD local date of the activity
  distance_km   numeric,
  duration_minutes numeric,
  created_at    timestamptz default now()
);

create index brick_activity_parts_lookup
  on brick_activity_parts (user_id, external_id, group_id);

alter table brick_activity_parts enable row level security;

create policy "Users can view their own brick parts"
  on brick_activity_parts for select
  using (user_id = auth.uid());
