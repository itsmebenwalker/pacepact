-- Add stripe_session_id to groups so the processing page can locate the group
-- after Stripe redirects back from checkout.

ALTER TABLE groups ADD COLUMN stripe_session_id text UNIQUE;

CREATE INDEX groups_stripe_session_id_idx ON groups (stripe_session_id)
  WHERE stripe_session_id IS NOT NULL;
