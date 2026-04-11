-- Make external_id nullable in brick_activity_parts.
--
-- Garmin multisport activities share the same external_id across legs, which
-- is how partner detection works (second leg finds first leg by external_id).
-- Non-Garmin activities (phone GPS, manual entry) have no external_id but
-- should still park in a brick week — they resolve via manual assignment or
-- orphan release when the brick eventually completes.

alter table brick_activity_parts alter column external_id drop not null;
