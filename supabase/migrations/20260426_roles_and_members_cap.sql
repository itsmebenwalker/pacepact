-- Add user role to profiles
ALTER TABLE profiles
  ADD COLUMN role text CHECK (role IN ('admin', 'founding'));

-- Add member cap to groups (null = unlimited)
ALTER TABLE groups
  ADD COLUMN members_cap integer;
