---
title: "Business identifiers: UHID, visit & bill numbers"
objective: How the HIMS allocates human-readable business identifiers — patient UHID, OP visit and OP bill numbers — with per-tenant formats, atomic counters each module owns, and configuration served over HTTP.
---

Every patient, visit and bill gets a short, human-readable **business identifier** (distinct from its internal UUID primary key). Three examples, all allocated the same way:

```data-model title="What gets allocated (allocator: modules/{empi,registration,billing})"
. patient_uhid — allocated by empi · counterSchema "empi"
.   format text — "YYMMDD" + "TTTTT" + "XXXXXXX" → e.g. 260327 00003 0000001
.   sample text — "260327000030000001"
. op_visit — allocated by registration · counterSchema "registration"
.   format text — "OP" + "YYMMDD" + "XXXXXXX" → e.g. OP 260327 0000001
.   sample text — "OP2603270000001"
. op_bill — allocated by billing · counterSchema "billing"
.   format text — "OPB" + "YYMMDD" + "XXXXXXX" → e.g. OPB 260327 0000001
.   sample text — "OPB2603270000001"
```

`TTTTT` = 5-digit numeric tenant code (`normalizeTenantNumericCode`); `XXXXXXX` = 7-digit zero-padded per-day sequence. The UHID and OP-visit samples above are asserted verbatim in `packages/ts-sdk-sequence/test/unit/compose.test.ts` (which also pins the `op_bill:260602` counter-key partition). The default segment layout (prefix / date / tenant / sequence) lives in `compose.ts` (`defaultSegments`, `DEFAULT_PREFIX`); a tenant may override any of it via `identifier_overrides`. The full type list — `ip_visit`, `emergency_visit`, `ip_bill`, `emergency_bill` — is in `packages/ts-sdk-sequence/src/types.ts`.

## The allocation path

One primitive, `allocateIdentifier` (`packages/ts-sdk-sequence/src/allocate-identifier.ts`), does the work: resolve the effective format, build a date-partitioned counter key, increment the **module's own** counter, compose the string. The tenant config is *injected* by the caller — the package never touches configurator's database.

```diagram title="Allocating an OP bill number" look=clean
sequenceDiagram
  participant H as billing handler
  participant A as allocateIdentifier
  participant L as sequenceConfigLoader
  participant C as configurator S2S
  participant DB as billing.sequence_counters
  H->>L: loadSequenceConfig tenantId
  alt cache hit under 60s
    L-->>H: cached config
  else miss
    L->>C: GET internal sequence-config
    C-->>L: tenant_numeric_code + overrides
    Note over L: cache success 60s, degrade never cached
  end
  H->>A: allocateIdentifier op_bill, schema billing
  A->>DB: INSERT .. ON CONFLICT DO UPDATE current_value + 1
  DB-->>A: next sequence
  A-->>H: OPB2603270000001
```

The counter key is date-partitioned — `buildCounterKey` returns `` `${identifierType}:${datePart}` `` (e.g. `op_bill:260602`), so each tenant's daily stream restarts at `1`. Callers wire this up at service boot: see `services/billing-svc/src/main.ts`, `services/registration-svc/src/main.ts` (`allocateOpVisitId`), and `services/empi-svc/src/main.ts` (`allocatePatientUhid`).

## The config loader (bounded cache, safe degrade)

`createHttpSequenceConfigLoader` (`packages/ts-sdk-sequence/src/sequence-config-loader.ts`) is built once per service and holds an in-memory TTL cache.

```code lang=ts file=sequence-config-loader.ts (defaults)
ttlMs   = 60_000   // cache freshness window
maxEntries = 1024  // FIFO eviction when full
timeoutMs = 5_000  // per-request abort
// On fetch / non-2xx / parse failure: WARN + return platform defaults
// (fallback numeric code, no overrides) and DO NOT cache — a transient
// outage never sticks a degraded value.
```

## S2S config endpoint

Configurator owns the config and serves exactly the two fields the allocator needs from its own tables. The route sits under configurator-svc's `/internal/` skip prefix (no JWT) and self-gates on the internal key (`modules/configurator/src/rest-handlers/internal-sequence-config.handler.ts`, `http/assert-configurator-internal-access.ts`).

```api-endpoint method=GET path=/api/configurator/v1/internal/tenants/:tenantId/sequence-config title="Tenant sequence config (service-to-service)"
. auth x-configurator-internal-key — CONFIGURATOR_INTERNAL_API_KEY; skipped in non-prod dev when unset
. path tenantId string — tenant to resolve
response 200:
{ "tenant_numeric_code": "00003", "identifier_overrides": {} }
response 404:
{ "error": "Tenant not found", "code": "NOT_FOUND" }
```

## The counter table (each module owns one)

Billing and registration each declare their own `sequence_counters` in their own schema; the allocator (`counter.ts`) builds an identical Drizzle table instance targeting `counterSchema`. Empi owns one too (`empi.sequence_counters`, for `patient_uhid`).

```data-model title="<schema>.sequence_counters — modules/billing/src/schema/tables.ts, modules/registration/src/schema/tables.ts"
. sequence_counters
.   iq_tenant_id uuid PK — Citus distribution column
.   sequence_name text PK — e.g. "op_bill:260602"
.   current_value bigint — default 0; incremented atomically
```

Each table is `create_distributed_table(..., 'iq_tenant_id')` and colocated with its module's other tables (`modules/billing/migrations/0004_distribute_sequence_counters.sql`, `modules/registration/migrations/0003_distribute_sequence_counters.sql`), so the `INSERT .. ON CONFLICT DO UPDATE` allocation stays local to the tenant shard.

```callout tone=decision title="Why each module owns its counter (rebuilt this week — commit cdd965a4)"
The previous design had **billing and registration writing into `empi.sequence_counters`** — a cross-schema write via a locally-declared `pgSchema("empi")` table — while reading `configurator.tenants` + `configurator.sequence_configuration` through a cross-schema SQL JOIN (census row 2, `docs/architecture/cleanup/cross-schema-census.md`). Both reach-ins are eliminated: **each module now owns its counter table in its own schema**, and configurator keeps sole ownership of the *config*, served over the S2S HTTP route above. Modules stay database-separable; `allocateIdentifier` stays pure (no HTTP, no SQL into another schema). Given the same injected config the composed identifier is byte-identical to before. Counters are new tables with no data to carry over — dev boxes `make db-reset`.
```
