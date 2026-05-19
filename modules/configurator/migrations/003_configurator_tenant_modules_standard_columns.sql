-- Legacy no-op: tenant_modules shape is applied idempotently in 002_configurator_tenant_modules.sql.
-- Kept so existing migration ordering (002 → 003 → 004) stays stable.

SELECT 1;
