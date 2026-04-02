-- Migration: add group message board
-- Apply via Supabase SQL editor or `supabase db push`

create table messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references groups(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  content text not null check (char_length(content) <= 200),
  created_at timestamptz default now() not null
);

create index messages_group_created_at_idx on messages (group_id, created_at);

-- ── Row Level Security ────────────────────────────────────────────────────────

alter table messages enable row level security;

-- Group members can read messages in groups they belong to
create policy "group members can read messages"
  on messages for select
  using (
    exists (
      select 1 from group_members
      where group_members.group_id = messages.group_id
        and group_members.user_id = auth.uid()
    )
  );

-- Group members can post messages in groups they belong to
create policy "group members can insert messages"
  on messages for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from group_members
      where group_members.group_id = messages.group_id
        and group_members.user_id = auth.uid()
    )
  );

-- ── Realtime ──────────────────────────────────────────────────────────────────
-- Enable Realtime on this table in the Supabase dashboard:
--   Database → Replication → supabase_realtime publication → add `messages`
-- Or run:
alter publication supabase_realtime add table messages;
