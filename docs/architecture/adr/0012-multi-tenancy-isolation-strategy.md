# ADR-0012: Multi-tenancy isolation strategy

- **Status:** Proposed
- **Date:** 2026-04-28
- **Deciders:** [Engineering Manager], [Architect]

## Context and problem statement

The HIMS platform is multi-tenant: a single deployment serves multiple hospitals, each identified by `iq_tenant_id`. Tenants range from a 10-bed clinic running one module to a tertiary-care institution running the full platform. Some tenants (government hospitals, large chains) have regulatory or contractual requirements for physical data separation. The platform must isolate tenant data at the database layer while keeping module code tenant-unaware -- the same `WHERE iq_tenant_id = X` query must work identically regardless of the underlying isolation mechanism. See [HLD 01 section 6](../hld/01-system-overview.md#6-multi-tenancy-summary) and [HLD 03 section 10](../hld/03-module-shape-template.md#10-multi-tenancy-contract).

## Decision drivers

- Module code must not change between co-located and physically isolated tenants. The isolation strategy is a data-layer concern, invisible to business logic ([HLD 03 section 10](../hld/03-module-shape-template.md#10-multi-tenancy-contract)).
- The `iq_tenant_id` is a JWT claim, validated on every request. Every table holding tenant-scoped data includes this column. This is structural, not optional ([HLD 01 section 6.1](../hld/01-system-overview.md#61-organization-and-tenant-identity)).
- Some tenants require physical data separation (dedicated hardware) for regulatory compliance while most tenants can share infrastructure to reduce cost.
- The two-level hierarchy (Organization to Tenant) means cross-tenant analytics at the organization level must be a supported, authorized access pattern -- not a bypass of isolation ([HLD 01 section 6.1](../hld/01-system-overview.md#61-organization-and-tenant-identity)).
- Tenant-specific authorization is handled via Cerbos scopes, not policy forks. The isolation strategy must complement, not duplicate, the authorization model ([HLD 01 section 6.3](../hld/01-system-overview.md#63-tenant-specific-authorization)).
- Operational cost must scale with tenant count. The isolation model should not require provisioning a full database instance per tenant when the platform serves hundreds of small hospitals.

## Considered options

1. **Database-per-tenant** -- each tenant gets a dedicated PostgreSQL database instance (or cluster). Complete physical isolation. Module connection strings are resolved per-tenant at runtime.
2. **Schema-per-tenant** -- all tenants share a database instance, but each tenant has a dedicated PostgreSQL schema. Module code qualifies table references with the tenant's schema name.
3. **Shared database with tenant discriminator column + Citus sharding** -- all tenants share the same schema. Every table has an `iq_tenant_id` column. Default: all tenants co-located. Premium: Citus distributes tables on `iq_tenant_id`, placing a tenant's data on dedicated shards for physical separation. Module code is identical in both cases.

## Decision outcome

Chosen option: **Shared database with tenant discriminator column + Citus sharding**, because it is the only model where module code is truly tenant-unaware. `WHERE iq_tenant_id = X` works identically whether the data is co-located or sharded to dedicated hardware. Schema-per-tenant and database-per-tenant both leak the isolation strategy into module code (schema qualification or connection routing), violating the principle that multi-tenancy is a data-layer concern. The Citus sharding upgrade path lets the platform offer physical isolation to tenants that require it without forking the codebase or the deployment pipeline.

### Consequences

**Positive:**

- Module code never changes between isolation levels. A module developer writes `WHERE iq_tenant_id = :tenant_id` and the data layer handles whether that routes to a co-located row or a dedicated shard. This eliminates an entire class of tenant-aware branching in application code.
- Cost-efficient for the common case. Most tenants (small hospitals, clinics) share infrastructure. The platform provisions dedicated shards only for tenants with contractual or regulatory isolation requirements. The Configurator stores the isolation level per tenant ([HLD 02 section 3.2](../hld/02-core-modules.md#32-owns)).
- Citus is a PostgreSQL extension, not a separate database product. The same PostgreSQL tooling, monitoring, backup strategies, and ORM configurations apply. Module developers do not need to learn a new database technology.
- The `iq_tenant_id` column serves double duty: it is both the tenant discriminator for application-level isolation and the Citus distribution key for physical isolation. No redundant columns, no mapping layer.
- Cross-tenant organization-level queries (e.g., consolidated analytics across all hospitals in a chain) are standard SQL with appropriate authorization -- they do not require stitching results from separate databases or schemas.

**Negative / accepted trade-offs:**

- Shared-database isolation relies on correct enforcement of the `iq_tenant_id` WHERE clause in every query. A bug that omits the clause leaks data across tenants. Mitigation: the PEP middleware's `PlanResources` integration injects the tenant filter automatically at the data-access layer, and Cerbos policies enforce tenant scoping at the authorization layer. Defense in depth, not defense in one place ([HLD 03 section 10](../hld/03-module-shape-template.md#10-multi-tenancy-contract)).
- Citus sharding introduces operational complexity for the database team: shard placement, rebalancing, and monitoring. This complexity is borne by the platform infrastructure team, not by module teams, but it is real.
- Noisy-neighbor risk exists for co-located tenants. A tenant with heavy query load affects co-located tenants' performance. Mitigation: Citus allows moving high-load tenants to dedicated shards reactively, and the Configurator can flag tenants for isolation proactively based on usage patterns.
- Schema migrations must be Citus-compatible. Distributed tables have constraints on foreign keys (must include the distribution column) and unique indexes (must include the distribution column). Module teams must follow Citus-compatible migration patterns, which is an additional constraint on schema design.

**Follow-up actions:**

- [ ] Define the data-access layer's automatic tenant-scoping mechanism (middleware, ORM plugin, or query interceptor) and document it in the module shape template.
- [ ] Establish Citus-compatible schema migration guidelines for module teams.
- [ ] Define the Configurator's tenant isolation level field and the operational workflow for upgrading a tenant from co-located to sharded.
- [ ] Produce load-testing benchmarks for co-located tenants to establish noisy-neighbor thresholds.

## Pros and cons of the options

### Database-per-tenant

- *Good:* Strongest physical isolation. A tenant's data is in a completely separate database instance. Backup, restore, and compliance auditing operate at the tenant level without filtering.
- *Good:* No noisy-neighbor risk. Each tenant's queries run against their own database resources.
- *Good:* Tenant offboarding is straightforward: drop the database.
- *Bad:* Operational cost scales linearly with tenant count. Each database instance requires provisioning, monitoring, patching, and backup. At 500 tenants, this is 500 database instances -- a significant infrastructure burden.
- *Bad:* Module code must resolve the correct database connection per tenant at runtime. This means connection-routing middleware, per-tenant connection pools, and schema migration tooling that targets all instances. The isolation strategy leaks into the application layer.
- *Bad:* Cross-tenant queries (organization-level analytics) require federated queries across multiple databases or a separate analytics pipeline that aggregates data from all tenant databases. This is expensive to build and maintain.
- *Bad:* Fragmented adoption with many small tenants (the primary market) makes this model economically unviable. A standalone pharmacy generating minimal revenue cannot justify a dedicated database instance.

### Schema-per-tenant

- *Good:* Logical isolation within a shared database instance. Each tenant's tables are in a separate PostgreSQL schema, providing namespace separation.
- *Good:* Lower operational overhead than database-per-tenant: one database instance to manage, one set of backups, one monitoring stack.
- *Good:* Tenant offboarding is clean: drop the schema.
- *Bad:* Module code must qualify table references with the tenant's schema name (e.g., `SET search_path TO tenant_xyz` or explicit `tenant_xyz.patients`). This leaks the isolation strategy into the data-access layer, requiring schema-routing middleware.
- *Bad:* Schema migrations must run once per tenant schema. At 500 tenants, a schema migration is 500 DDL operations. Migration tooling becomes non-trivial, and a failed migration on tenant 347 leaves the platform in an inconsistent state.
- *Bad:* Physical isolation is not achievable. All schemas share the same database instance and the same storage. A tenant requiring dedicated hardware cannot be accommodated without moving to a separate database, which reintroduces the database-per-tenant problems for that tenant.
- *Bad:* Cross-tenant queries require UNION ALL across schemas or a separate aggregation mechanism. PostgreSQL does not optimize cross-schema queries as a single-schema query with a WHERE clause.

### Shared database with tenant discriminator column + Citus sharding

- *Good:* Module code is tenant-unaware. `WHERE iq_tenant_id = :tenant_id` is the only tenant-related concern, and it is injected by the data-access layer, not by business logic.
- *Good:* Default co-location keeps cost low for the majority of tenants. Premium isolation via Citus sharding is an operational upgrade, not a code change.
- *Good:* Schema migrations run once against the shared schema. Citus propagates DDL to shards automatically for distributed tables.
- *Good:* Cross-tenant queries are standard SQL. Organization-level analytics joins or aggregates across tenant data within the same schema, authorized by Cerbos policies.
- *Good:* The upgrade path from co-located to sharded is smooth: the Configurator flags the tenant, the DBA moves the tenant's data to a dedicated shard using Citus rebalancing, and module code is unchanged.
- *Bad:* Application-level isolation depends on correct enforcement of the `iq_tenant_id` filter in every query. A missed filter is a data leak. Requires automated enforcement at the data-access layer and defense-in-depth via Cerbos.
- *Bad:* Citus-compatible schema design imposes constraints: distribution columns must appear in primary keys, foreign keys, and unique indexes. Module teams must learn these constraints.
- *Bad:* Noisy-neighbor risk for co-located tenants, mitigated by reactive shard isolation for high-load tenants.

## Links

- Related ADRs: [ADR-0002](./0002-multi-tenant-fragmentable-adoption.md), [ADR-0006](./0006-four-core-platform-modules.md), [ADR-0007](./0007-empi-dedicated-platform-service.md)
- Related HLD: [System Overview -- multi-tenancy summary](../hld/01-system-overview.md#6-multi-tenancy-summary), [System Overview -- data isolation](../hld/01-system-overview.md#62-data-isolation), [Module Shape Template -- multi-tenancy contract](../hld/03-module-shape-template.md#10-multi-tenancy-contract)
- External sources:
  - Microsoft, "Multitenancy and Azure SQL Database", https://learn.microsoft.com/en-us/azure/azure-sql/database/saas-tenancy-app-design-patterns, accessed 2026-04-28
  - Citus Data / Microsoft, "Multi-tenant SaaS Tutorial", https://docs.citusdata.com/en/stable/develop/migration_mt_ror.html, accessed 2026-04-28
  - Martin Kleppmann, *Designing Data-Intensive Applications*, O'Reilly, 2017, ch. 6 (on partitioning strategies and the trade-offs between co-located and distributed data)
