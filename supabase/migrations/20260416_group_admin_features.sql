-- Group admin features: invite locking, member banning, rotate invite code

-- 1. Add invite_locked flag to groups
ALTER TABLE groups ADD COLUMN IF NOT EXISTS invite_locked boolean NOT NULL DEFAULT false;

-- 2. Banned members table
CREATE TABLE IF NOT EXISTS group_member_bans (
  group_id  uuid REFERENCES groups(id)   ON DELETE CASCADE NOT NULL,
  user_id   uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  banned_by uuid REFERENCES profiles(id) NOT NULL,
  banned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);

ALTER TABLE group_member_bans ENABLE ROW LEVEL SECURITY;

-- Users can see their own ban records (needed for join-gate check via user client)
CREATE POLICY "users can view their own bans"
  ON group_member_bans FOR SELECT
  USING (user_id = auth.uid());

-- Only service role may insert/delete (kick action in webhook handler uses service client)
-- No INSERT/DELETE policy needed — service role bypasses RLS by default
