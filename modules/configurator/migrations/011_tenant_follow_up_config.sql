-- Per-tenant OPD free follow-up policy (same role as legacy facility.freeFollowUpDays / freeFollowUpVisits).

ALTER TABLE configurator.tenants
  ADD COLUMN IF NOT EXISTS free_follow_up_days smallint NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS free_follow_up_visits smallint NOT NULL DEFAULT 1;

ALTER TABLE configurator.tenants
  DROP CONSTRAINT IF EXISTS chk_tenants_free_follow_up_days;

ALTER TABLE configurator.tenants
  ADD CONSTRAINT chk_tenants_free_follow_up_days
  CHECK (free_follow_up_days >= 0);

ALTER TABLE configurator.tenants
  DROP CONSTRAINT IF EXISTS chk_tenants_free_follow_up_visits;

ALTER TABLE configurator.tenants
  ADD CONSTRAINT chk_tenants_free_follow_up_visits
  CHECK (free_follow_up_visits >= 0);
