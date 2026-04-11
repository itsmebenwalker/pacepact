-- Extend brick_activity_parts with activity stats for combined matching.
--
-- When both legs of a Garmin brick workout arrive, the combined distance and
-- duration are validated against the brick session target (85% threshold),
-- matching the same completion rules applied to regular sessions.

alter table brick_activity_parts
  add column if not exists distance_km numeric,
  add column if not exists duration_minutes numeric;
