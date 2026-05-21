-- Platform dev bootstrap marker (capabilities + super-admin are applied in TypeScript after SQL migrations).
-- See `src/dev/platform-data-bootstrap.ts` invoked from `scripts/apply-migration.ts`.

COMMENT ON SCHEMA user_management IS 'User Management — capabilities synced from global_master on db-migrate';
