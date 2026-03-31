-- PacePact schema
-- Run this in your Supabase SQL editor

-- Profiles (extends auth.users)
create table profiles (
  id uuid references auth.users primary key,
  display_name text,
  avatar_url text,
  strava_athlete_id bigint unique,
  strava_access_token text,
  strava_refresh_token text,
  strava_token_expires_at timestamptz,
  created_at timestamptz default now()
);

-- Groups
create table groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  event_name text not null,
  event_type text not null,
  event_date date not null,
  ambition text not null,
  training_plan jsonb not null,
  training_plan_raw text,
  invite_code text unique not null,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- Group members
create table group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references groups(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  points integer default 0,
  joined_at timestamptz default now(),
  unique(group_id, user_id)
);

-- Sessions
create table sessions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references groups(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  week_number integer not null,
  session_type text not null,
  target_distance_km numeric,
  target_duration_minutes integer,
  target_description text,
  scheduled_date date,
  completed boolean default false,
  completed_at timestamptz,
  strava_activity_id bigint,
  points_awarded integer default 0,
  created_at timestamptz default now()
);

-- Performance index
create index idx_sessions_user_group_date
  on sessions(user_id, group_id, completed, scheduled_date);

-- Strava webhook event log
create table strava_webhook_events (
  id uuid primary key default gen_random_uuid(),
  payload jsonb not null,
  processed boolean default false,
  processed_at timestamptz,
  created_at timestamptz default now()
);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table profiles enable row level security;
alter table groups enable row level security;
alter table group_members enable row level security;
alter table sessions enable row level security;
alter table strava_webhook_events enable row level security;

-- Profiles: users can read/update their own
create policy "Users can view own profile"
  on profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

create policy "Users can insert own profile"
  on profiles for insert with check (auth.uid() = id);

-- Groups: members can read groups they belong to
create policy "Members can view their groups"
  on groups for select using (
    exists (
      select 1 from group_members
      where group_members.group_id = groups.id
      and group_members.user_id = auth.uid()
    )
  );

-- Group members: members can see other members in same group
create policy "Members can view group members"
  on group_members for select using (
    exists (
      select 1 from group_members gm2
      where gm2.group_id = group_members.group_id
      and gm2.user_id = auth.uid()
    )
  );

-- Sessions: users can only see their own sessions
create policy "Users can view own sessions"
  on sessions for select using (auth.uid() = user_id);

-- Webhook events: no direct user access (service role only)
create policy "No public access to webhook events"
  on strava_webhook_events for all using (false);

-- ============================================================
-- Trigger: auto-create profile on new user sign up
-- ============================================================

create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
