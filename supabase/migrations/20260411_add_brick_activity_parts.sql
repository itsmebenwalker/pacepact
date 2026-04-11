-- Pending brick activity parts
-- When Garmin syncs a brick workout, Strava splits it into separate run/ride activities
-- that share the same external_id. We store the first leg here until the second arrives,
-- then complete the brick session and delete the row.
create table brick_activity_parts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  external_id text not null,
  activity_type text not null, -- 'run' or 'ride'
  created_at timestamptz default now()
);

create index brick_activity_parts_lookup on brick_activity_parts (user_id, external_id);
