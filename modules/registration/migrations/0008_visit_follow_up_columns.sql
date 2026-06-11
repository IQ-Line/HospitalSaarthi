-- OPD follow-up metadata on registration.visit (parity with legacy Visit follow-up fields).

ALTER TABLE registration.visit
  ADD COLUMN IF NOT EXISTS consultation_type varchar(32) NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS is_free_follow_up boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS free_follow_up_visit_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS free_follow_up_valid_till timestamptz,
  ADD COLUMN IF NOT EXISTS free_follow_up_details jsonb,
  ADD COLUMN IF NOT EXISTS parent_visit_id uuid;
