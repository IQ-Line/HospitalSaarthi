-- Organisation profile columns: optional contact email and website URL.

ALTER TABLE configurator.organizations
  ADD COLUMN IF NOT EXISTS website text;

-- contact_email was nullable in 001; ensure no NOT NULL constraint remains.
ALTER TABLE configurator.organizations
  ALTER COLUMN contact_email DROP NOT NULL;

COMMENT ON COLUMN configurator.organizations.contact_email IS
  'Optional primary contact email for the organization';
COMMENT ON COLUMN configurator.organizations.website IS
  'Optional organisation website URL (http/https)';
