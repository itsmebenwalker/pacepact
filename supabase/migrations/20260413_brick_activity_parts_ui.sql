-- Extend brick_activity_parts for UI-driven assignment.
--
-- Adds the context needed to display pending brick legs in the session plan
-- and let users manually assign a single leg to a standalone session.

alter table brick_activity_parts
  add column if not exists group_id uuid references groups(id) on delete cascade,
  add column if not exists strava_activity_id bigint,
  add column if not exists activity_name text,
  add column if not exists activity_date text; -- YYYY-MM-DD local date of the activity

-- Update the lookup index to include group_id for per-group UI queries
drop index if exists brick_activity_parts_lookup;
create index brick_activity_parts_lookup on brick_activity_parts (user_id, external_id, group_id);

-- Enable RLS so the client can read its own pending parts for the progress bar
alter table brick_activity_parts enable row level security;

create policy "Users can view their own brick parts"
  on brick_activity_parts for select
  using (user_id = auth.uid());
