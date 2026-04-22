-- Drop external_id from brick_activity_parts.
-- Brick second-leg detection now uses same-day matching (complementary activity
-- type on the same activity_date) rather than external_id matching. Same-day
-- matching covers all cases including Garmin multisport, since both legs land on
-- the same date.

drop index if exists brick_activity_parts_lookup;

alter table brick_activity_parts drop column if exists external_id;

-- Replace the old index with one that serves the same-day lookup query.
create index brick_activity_parts_lookup
  on brick_activity_parts (user_id, activity_date, activity_type);
