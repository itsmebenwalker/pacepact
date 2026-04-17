-- Add AI-generated coaching tip to each training session.
-- Populated at plan-generation time via Claude. Null for sessions created
-- before this migration — the UI falls back to a per-type default tip.
ALTER TABLE sessions ADD COLUMN tip text;
