# ADR-0021: Master Data catalog tenant key (`iq_tenant_id`) vs platform UUID tenant

- **Status:** Accepted
- **Date:** 2026-05-08
- **Deciders:** Platform architecture
- **Informed:** All services sending `iq_tenant_id` to Master Data

## Context and problem statement

Master Data previously accepted a **positive integer** in the `iq_tenant_id` HTTP header and persisted it on `tenant_master` rows, while `packages/ts-sdk-db` and other modules use **UUID** for the same conceptual field name. That mismatch broke header reuse, co-location reasoning, and UI expectations (slug tenants silently targeted `public`).

## Decision outcome

**Align Master Data catalog scope with UUID:** `CatalogScope.iq_tenant_id` is `UUID | None`; the header must be a canonical UUID string when present. PostgreSQL `tenant_master.*.iq_tenant_id` columns are `UUID` (see Alembic **`022_tm_iq_tenant_uuid`** — truncates `tenant_master` then alters column type; re-seed tenant rows after upgrade).

### Consequences

**Positive:**

- Same string shape as `ts-sdk-db` `tenantColumn().iq_tenant_id` and Configurator tenant ids the SPA already holds as UUID strings.

**Negative / accepted trade-offs:**

- **022** is destructive for `tenant_master` data on PostgreSQL (documented in the migration header).

## More information

- LLD: [01-catalog-dual-schema.md](../lld/master-data/01-catalog-dual-schema.md), [02-api-contracts.md](../lld/master-data/02-api-contracts.md)
- Dual-schema ADR: [ADR-0020](./0020-master-data-catalog-dual-schema.md)
- Visitpad code packages: [04-visitpad-package-layout.md](../lld/master-data/04-visitpad-package-layout.md)
