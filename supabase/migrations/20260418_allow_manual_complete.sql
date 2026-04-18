-- Allow admins to opt groups in/out of manual session completion.
-- Default true so existing groups keep their current behaviour.
ALTER TABLE groups
  ADD COLUMN allow_manual_complete boolean NOT NULL DEFAULT true;
