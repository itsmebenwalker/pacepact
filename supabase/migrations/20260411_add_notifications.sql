-- Migration: add notification system
-- Apply via Supabase SQL editor or `supabase db push`

-- ── Notification preferences on profiles ─────────────────────────────────────

ALTER TABLE profiles
  ADD COLUMN notify_admin_message boolean NOT NULL DEFAULT false,
  ADD COLUMN notify_any_message   boolean NOT NULL DEFAULT false;

-- ── Notifications table ───────────────────────────────────────────────────────

CREATE TABLE notifications (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type       text        NOT NULL CHECK (type IN ('message_admin', 'message_any', 'activity_matched')),
  group_id   uuid        REFERENCES groups(id) ON DELETE CASCADE,
  data       jsonb       NOT NULL DEFAULT '{}',
  read       boolean     NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX notifications_user_unread_idx
  ON notifications (user_id, read, created_at DESC);

-- ── Row Level Security ────────────────────────────────────────────────────────

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can view own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "users can update own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Service role inserts notifications (via webhook handler and DB trigger)
CREATE POLICY "service role can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- ── Realtime ──────────────────────────────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- ── Trigger: fan out message notifications ────────────────────────────────────
-- Runs after each INSERT on messages. For each group member (except the sender)
-- that has opted into admin-message or any-message notifications, inserts a
-- notification row. Uses SECURITY DEFINER so it can read profiles regardless
-- of RLS policies on that table.

CREATE OR REPLACE FUNCTION create_message_notifications()
RETURNS TRIGGER AS $$
DECLARE
  v_group_creator_id uuid;
  v_group_name       text;
  v_sender_name      text;
  v_sender_is_admin  boolean;
  v_member           RECORD;
BEGIN
  SELECT created_by, name
    INTO v_group_creator_id, v_group_name
    FROM groups
   WHERE id = NEW.group_id;

  SELECT display_name
    INTO v_sender_name
    FROM profiles
   WHERE id = NEW.user_id;

  v_sender_is_admin := (NEW.user_id = v_group_creator_id);

  FOR v_member IN
    SELECT gm.user_id, p.notify_admin_message, p.notify_any_message
      FROM group_members gm
      JOIN profiles p ON p.id = gm.user_id
     WHERE gm.group_id = NEW.group_id
       AND gm.user_id != NEW.user_id
  LOOP
    IF v_member.notify_any_message
       OR (v_member.notify_admin_message AND v_sender_is_admin)
    THEN
      INSERT INTO notifications (user_id, type, group_id, data)
      VALUES (
        v_member.user_id,
        CASE WHEN v_sender_is_admin THEN 'message_admin' ELSE 'message_any' END,
        NEW.group_id,
        jsonb_build_object(
          'content',     LEFT(NEW.content, 50),
          'group_name',  v_group_name,
          'sender_name', COALESCE(v_sender_name, 'Someone')
        )
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_message_insert
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION create_message_notifications();
