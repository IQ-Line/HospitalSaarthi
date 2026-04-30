# ADR-0013: Single database engine (PostgreSQL)

- **Status:** Proposed
- **Date:** 2026-04-30
- **Deciders:** [Architect], [Engineering Manager]

## Context and problem statement

The team has experience with MongoDB from the production HIMS and is questioning whether some modules should use MongoDB while others use PostgreSQL. Arguments cited include MongoDB's perceived read/write performance advantages and its schema flexibility. The platform architecture already assumes PostgreSQL with Citus sharding ([ADR-0012](./0012-multi-tenancy-isolation-strategy.md)), Drizzle ORM in the module shape template ([HLD 03](../hld/03-module-shape-template.md)), and a set of [database principles](../analysis/03-database-principles.md) built around PostgreSQL capabilities. This ADR makes the single-engine decision explicit and records the rationale.

## Decision drivers

- **Citus co-location must not be broken.** All of a tenant's data — across every module — must land on the same Citus worker node. This is what makes tenant-scoped cross-module projections and BFF aggregation fast ([database principles §1](../analysis/03-database-principles.md#1-one-citus-cluster-separate-schemas-per-module), [build order §7](../analysis/02-module-build-order.md#7-cross-module-queries-and-read-projections)).
- **7-person team cannot absorb two operational stacks.** Each database engine requires its own monitoring, backup strategy, connection pooling, security hardening, upgrade cycles, and on-call expertise.
- **Healthcare demands structural data integrity.** NABH accreditation, DPDP Act compliance, and clinical safety require that the database enforces constraints — not just the application. CHECK constraints, NOT NULL, foreign keys, and typed columns catch bugs that a schema-less document store lets through silently.
- **Module shape consistency.** The module shape template ([HLD 03](../hld/03-module-shape-template.md)) specifies Drizzle ORM, a single migration strategy, and standardised audit columns. A second database engine requires a parallel ORM (Mongoose/Prisma-Mongo), parallel migration tooling, and parallel testing patterns — doubling the surface area of the module contract.
- **The production HIMS's MongoDB usage is not a precedent.** The [rework-vs-rebuild analysis](../analysis/01-rework-vs-rebuild.md) concluded that the production HIMS's data layer cannot be carried forward. Its MongoDB schemas embed what should be relational data (nested prescription arrays, inline billing line items), making queries fragile and migrations painful. The new platform corrects this.

## Considered options

1. **PostgreSQL-only** — all modules use PostgreSQL schemas within the shared Citus cluster. JSONB columns handle genuinely unstructured data.
2. **MongoDB-only** — all modules use MongoDB collections. Tenant isolation via a `tenant_id` field in every document.
3. **Polyglot (per-module choice)** — each module team chooses PostgreSQL or MongoDB based on its data profile. Some modules use Citus, others use a shared MongoDB cluster.

## Decision outcome

Chosen option: **PostgreSQL-only**, because it is the only option that preserves Citus co-location across all modules, keeps the operational stack within the team's capacity, enforces data integrity at the database level, and maintains a single module shape contract. The flexibility that MongoDB offers is available through PostgreSQL's JSONB where genuinely needed, without the costs of a second database system.

### Consequences

**Positive:**

- All of a tenant's data remains co-located on the same Citus worker node regardless of which module owns it. Cross-module projections are node-local reads, not network hops.
- One backup strategy, one monitoring stack, one connection pooler (PgBouncer), one set of security hardening procedures. The infrastructure team manages one system well instead of two systems poorly.
- Every module follows the same Drizzle ORM patterns, the same migration strategy (`drizzle-kit`), the same audit column conventions. A developer moving from OPD to Billing does not need to learn a different data-access stack.
- CHECK constraints, foreign keys (within schemas), NOT NULL, and typed columns enforce data integrity at the database level. A malformed billing record or a prescription with an invalid status is rejected by PostgreSQL before it reaches the application — defense in depth that a document store does not provide by default.
- JSONB columns provide document-model flexibility for the cases that genuinely need it (event payloads, external API responses, tenant-customizable form fields) without a second database system. See [database principles §12](../analysis/03-database-principles.md#12-json-columns-for-truly-unstructured-data-only).

**Negative / accepted trade-offs:**

- The team must learn PostgreSQL and Drizzle. Most developers have MongoDB/Mongoose experience from the production HIMS. Mitigation: the database principles document and module shape template codify the patterns — developers follow conventions rather than making PostgreSQL design decisions from scratch. The learning curve is real but bounded and one-time.
- PostgreSQL schema migrations require more upfront discipline than MongoDB's schema-less approach. Columns must be typed, constraints must be defined, and Citus compatibility must be maintained (distribution column in primary keys and unique indexes). Mitigation: the database principles document provides explicit rules, and Drizzle generates migration SQL from TypeScript schema definitions — the developer experience is closer to "define types, run migrate" than "write raw DDL."
- JSONB columns are less ergonomic than native MongoDB document queries for deeply nested document operations. Mitigation: the architecture explicitly discourages deeply nested documents ([database principles §12](../analysis/03-database-principles.md#12-json-columns-for-truly-unstructured-data-only)) — structured data belongs in typed columns and related tables, not JSON blobs.

**Follow-up actions:**

- [ ] Include PostgreSQL + Drizzle in the team onboarding plan. Identify 2–3 reference patterns (CRUD module, projection table, JSONB usage) as worked examples.
- [ ] Establish a schema review checklist gate (per [database principles](../analysis/03-database-principles.md#summary-checklist-for-schema-review)) in the PR process for any migration that adds or modifies tables.

## Pros and cons of the options

### PostgreSQL-only

- *Good:* Citus co-location preserved. All tenant data across all modules on the same worker node. Cross-module projections are node-local.
- *Good:* Single operational stack. One backup strategy, one monitoring system, one connection pooler, one set of runbooks.
- *Good:* Structural data integrity. CHECK constraints, foreign keys, NOT NULL, typed columns — the database rejects invalid data before the application sees it.
- *Good:* Single module shape. Drizzle ORM, `drizzle-kit` migrations, standardized audit columns, consistent query patterns across all modules.
- *Good:* JSONB covers document-model use cases where genuinely needed (event payloads, external responses, custom fields) without a second engine.
- *Good:* SQL is the lingua franca for reporting. NABH-mandated reports, government dashboards, and clinical audits are straightforward queries — no ETL pipeline from a document store.
- *Bad:* Team learning curve. Most developers know MongoDB/Mongoose, not PostgreSQL/Drizzle.
- *Bad:* Upfront schema discipline. Columns must be typed and constrained before data flows in. No "just throw it in and figure out the shape later."
- *Bad:* Citus-specific constraints on schema design (distribution column in PKs and unique indexes) add a layer of rules that don't exist in vanilla PostgreSQL.

### MongoDB-only

- *Good:* Team familiarity. Developers can reuse MongoDB/Mongoose patterns from the production HIMS, reducing ramp-up time and avoiding the class of mistakes that come with learning a new database in production.
- *Good:* Schema flexibility during rapid prototyping. New fields can be added without migrations, which is genuinely valuable when the domain model is still being discovered. In early product development — especially when product stories are still arriving — this agility is a real advantage over PostgreSQL's upfront schema discipline.
- *Good:* Native document model. Clinical forms with variable fields, polymorphic records, and hierarchical data (e.g., a medication order with nested dosage schedules, substitution rules, and administration instructions) map naturally to documents without the impedance mismatch of relational normalization.
- *Good:* Horizontal scaling for read-heavy workloads. MongoDB's replica set read preferences allow distributing reads across secondaries, which is straightforward to configure and well-suited to reference data lookups (drug catalogs, ICD codes) that dominate hospital system traffic.
- *Bad:* No Citus-style tenant co-location. MongoDB shards data at the collection level, with each collection independently selecting its shard key [[MongoDB Sharding docs](https://www.mongodb.com/docs/manual/sharding/)]. A tenant's data across different collections with different shard keys is not guaranteed to be co-located — cross-module queries may require scatter-gather across shards.
- *Bad:* Structural integrity enforcement is opt-in and limited. MongoDB's [schema validation](https://www.mongodb.com/docs/manual/core/schema-validation/) validates individual documents against JSON Schema rules on a per-collection basis, but provides no mechanism for cross-document referential integrity — there are no foreign keys, no cross-collection constraints, and no equivalent of CHECK constraints that reference other columns. The production HIMS does not use schema validation at all. The [rework-vs-rebuild analysis](../analysis/01-rework-vs-rebuild.md) identified data integrity gaps (unbounded nested arrays, missing validations) that this limitation enables.
- *Bad:* Multi-document transactions carry significant overhead. MongoDB's own documentation states: *"In most cases, a distributed transaction incurs a greater performance cost over single document writes, and the availability of distributed transactions should not be a replacement for effective schema design"* [[MongoDB Transactions](https://www.mongodb.com/docs/manual/core/transactions/)]. Healthcare workflows frequently span multiple related records (visit + prescriptions + billing charges) that must be atomic.
- *Bad:* Reporting requires aggregation pipelines or ETL. MongoDB's aggregation framework is powerful but non-standard — reporting tools, BI integrations, and government-mandated dashboards (NABH, state health authority) expect SQL. Building and maintaining a separate analytics pipeline adds cost and latency.
- *Bad:* The entire architecture (module shape, database principles, ADR-0012) would need to be redesigned around MongoDB. This is not a swap of one component — it invalidates the foundational data-layer decisions.

### Polyglot (per-module choice)

- *Good:* Each module can use the database that best fits its data profile. A module with truly document-oriented data (e.g., clinical notes with variable structure) could use MongoDB.
- *Good:* Teams can start with what they know. MongoDB-familiar developers can ship early modules faster.
- *Bad:* **Breaks Citus co-location.** If OPD is in PostgreSQL and another module is in MongoDB, a tenant's data spans two database systems. Cross-module projections require network hops between Citus and MongoDB, and the projection pattern must bridge two query languages. See the [comparison diagram](../diagrams/excalidraw/adr-0013-single-vs-polyglot-db.excalidraw).
- *Bad:* **Doubles operational overhead.** Two database clusters to provision, monitor, back up, secure, and upgrade. Two sets of connection pooling. Two sets of on-call runbooks. For a 7-person team, this is not a theoretical concern — it is a capacity constraint.
- *Bad:* **Fractures the module shape contract.** PostgreSQL modules use Drizzle + `drizzle-kit` migrations + CHECK constraints. MongoDB modules use Mongoose + a different migration strategy + schema validation (if any). The "any developer can work on any module" promise breaks — developers must know both stacks.
- *Bad:* **Event-driven projections become cross-database.** When OPD (PostgreSQL) subscribes to patient events from EMPI and maintains `opd.patient_projection`, both sides are in the same Citus cluster — the event consumer writes to a local table. If EMPI were in MongoDB, the consumer must write to PostgreSQL from a MongoDB event — bridging two database systems in an event handler, with different transaction semantics, error modes, and retry strategies.
- *Bad:* **"Best tool for the job" drifts to "whichever tool the developer knows."** Without a clear boundary for when MongoDB is justified, module teams will default to familiarity rather than fit. The result is an unprincipled mix that serves neither database's strengths.

## Addressing performance concerns

The team has raised questions about MongoDB's read and write performance relative to PostgreSQL. Both claims deserve a direct response:

**"MongoDB has faster reads"** — MongoDB's read speed advantage comes from denormalization: embedding related data in a single document means one disk seek per read. This is a genuine architectural advantage when your access patterns align with your document structure. PostgreSQL achieves a comparable result with denormalized projection tables ([database principles §8](../analysis/03-database-principles.md#8-projection-tables-are-first-class-schema-citizens)) or materialized views — the new architecture already uses projection tables for cross-module read paths. For indexed lookups on normalized tables, PostgreSQL with proper indexes matches MongoDB's performance. An [open-source, reproducible benchmark by OnGres](https://ongres.com/blog/benchmarking-do-it-with-transparency/) found PostgreSQL outperformed MongoDB on transactional workloads, though benchmark results always depend on workload shape and should be read critically.

**"MongoDB has faster writes"** — MongoDB's default write concern acknowledges the write once it reaches the primary's memory. The [MongoDB write concern documentation](https://www.mongodb.com/docs/manual/reference/write-concern/) explains that `w:1` without `j:true` means data can be lost if the primary crashes before journaling — the write is acknowledged but not durable. For healthcare data, where losing a billing record or prescription is unacceptable, `j:true` (or `w:"majority"`) is required, and with durable writes the performance gap narrows substantially. PostgreSQL with `synchronous_commit = on` (the default) provides equivalent durability guarantees at comparable speed.

**"MongoDB is more flexible"** — This is genuinely true, and for some workloads it is a significant advantage. Schema-less development lets teams iterate faster when the data model is uncertain. The counterargument is specific to healthcare: the production HIMS stores prescriptions as nested JSON arrays inside visit documents, and a malformed entry (missing dosage, invalid drug reference, wrong type) is accepted silently because there is no schema enforcement. In a system where data integrity has patient-safety and regulatory implications — US HIPAA [45 CFR 164.312](https://www.law.cornell.edu/cfr/text/45/164.312) requires integrity controls for protected health information, and NABH accreditation requires audit trails — the database should enforce constraints, not just the application. Flexibility is available through JSONB columns where the data is genuinely unstructured ([database principles §12](../analysis/03-database-principles.md#12-json-columns-for-truly-unstructured-data-only)), with [GIN indexing](https://www.postgresql.org/docs/current/datatype-json.html) for performant queries on semi-structured data.

**At AIIMS scale** — the workload is thousands of concurrent users across a multi-hospital network, not millions of requests per second. This is well within PostgreSQL's proven operating range. The bottleneck in hospital software is data correctness and regulatory compliance, not raw throughput.

**A note on defaults** — PostgreSQL ships with defaults tuned for wide compatibility rather than performance. The [PostgreSQL wiki](https://wiki.postgresql.org/wiki/Tuning_Your_PostgreSQL_Server) states: *"odds are good the default parameters are very undersized for your system."* This is a common criticism and it is valid — but it is an operational concern, not an architectural one. Tools like [PGTune](https://pgtune.leopard.in.ua/) generate a production-ready configuration in seconds from hardware specs, and the database principles document includes a [tuning section](../analysis/03-database-principles.md#13-postgresql-production-tuning) with the key parameters. The team should not confuse "PostgreSQL requires tuning" with "PostgreSQL is slow."

## Links

- Related ADRs: [ADR-0012](./0012-multi-tenancy-isolation-strategy.md) (multi-tenancy isolation strategy), [ADR-0008](./0008-module-shape-and-boundaries.md) (module shape and boundaries)
- Related HLD: [Module Shape Template](../hld/03-module-shape-template.md), [System Overview — multi-tenancy](../hld/01-system-overview.md#6-multi-tenancy-summary)
- Related analysis: [Database Principles](../analysis/03-database-principles.md), [Rework vs. Rebuild](../analysis/01-rework-vs-rebuild.md)
- Diagram: [Single-engine vs. polyglot comparison](../diagrams/excalidraw/adr-0013-single-vs-polyglot-db.excalidraw)
- External sources:
  - MongoDB Inc., "Transactions", https://www.mongodb.com/docs/manual/core/transactions/, accessed 2026-04-30 — *"a distributed transaction incurs a greater performance cost over single document writes"*
  - MongoDB Inc., "Schema Validation", https://www.mongodb.com/docs/manual/core/schema-validation/, accessed 2026-04-30 — per-collection, opt-in JSON Schema validation; no cross-document referential integrity
  - MongoDB Inc., "Sharding", https://www.mongodb.com/docs/manual/sharding/, accessed 2026-04-30 — *"MongoDB shards data at the collection level"*; each collection selects its shard key independently
  - MongoDB Inc., "Write Concern", https://www.mongodb.com/docs/manual/reference/write-concern/, accessed 2026-04-30 — `w:1` acknowledges before journal sync; `j:true` adds durability guarantee
  - PostgreSQL Global Development Group, "JSON Types", https://www.postgresql.org/docs/current/datatype-json.html, accessed 2026-04-30 — JSONB type with GIN indexing for document-model queries
  - PostgreSQL Community, "Tuning Your PostgreSQL Server", https://wiki.postgresql.org/wiki/Tuning_Your_PostgreSQL_Server, accessed 2026-04-30 — *"odds are good the default parameters are very undersized for your system"*
  - Citus Data / Microsoft, "When to use Citus", https://docs.citusdata.com/en/stable/get_started/what_is_citus.html, accessed 2026-04-30
  - OnGres, "Benchmarking: Do It With Transparency Or Don't Do It At All", https://ongres.com/blog/benchmarking-do-it-with-transparency/, accessed 2026-04-30 — open-source reproducible benchmark; PostgreSQL outperformed MongoDB on transactional workloads
  - U.S. Dept. of Health and Human Services, "45 CFR 164.312 — Technical Safeguards", https://www.law.cornell.edu/cfr/text/45/164.312, accessed 2026-04-30 — integrity controls (§c) and audit controls (§b) for electronic protected health information
  - Martin Kleppmann, *Designing Data-Intensive Applications*, O'Reilly, 2017, ch. 2–3 (data models and storage engines — relational vs. document trade-offs)
