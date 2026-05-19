# ADR-0020: Master Data Visitpad catalogs use dual physical schemas (`global_master` vs `tenant_master`)

- **Status:** Accepted
- **Date:** 2026-05-08
- **Deciders:** Platform architecture
- **Informed:** Master Data module owners, frontend Visitpad feature

## Context and problem statement

Visitpad (and related) catalog data must exist in two scopes: a **shared global** row set and **per-tenant** overrides, with clear uniqueness rules and no accidental cross-tenant reads when filters are wrong.

## Decision drivers

- Must support explicit **import** from global into tenant scope without row inheritance confusion.
- Must avoid nullable `tenant_id` foot-guns on a single wide table where one forgotten `WHERE` leaks data.
- Must stay compatible with **Citus** distribution and module-owned schemas (see [03-database-principles](../analysis/03-database-principles.md)).

## Considered options

1. **Single table per entity** with nullable `tenant_id` and two partial unique indexes (global vs tenant).
2. **Dual physical schemas** — `global_master.*` for global rows, `tenant_master.*` for tenant rows (same shape, no nullable scope column on `global_master`).
3. **Separate databases** per scope — rejected as operational overhead for Phase 0.

## Decision outcome

Chosen option: **dual physical schemas (`global_master` + `tenant_master`)**, because physical separation makes scope errors obvious at the SQL layer, matches the Issue #25 walk-back (disjoint global/tenant, explicit import), and keeps `global_master` rows free of a synthetic “platform tenant” key.

### Consequences

**Positive:**

- Filters are schema-scoped; harder to accidentally union global and tenant rows.
- Migrations can evolve global vs tenant shapes in one revision with parallel DDL.

**Negative / accepted trade-offs:**

- Doubled table surface area and migration DDL (every change touches two schemas).
- Application code must use model factories / scope objects so services do not hard-code schema names ad hoc.

## More information

- LLD: [01-catalog-dual-schema.md](../lld/master-data/01-catalog-dual-schema.md)
- Related: [ADR-0021](./0021-master-data-catalog-tenant-key-type.md) (catalog tenant key type vs platform UUID tenant).
