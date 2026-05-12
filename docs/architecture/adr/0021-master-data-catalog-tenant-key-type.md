# ADR-0021: Master Data catalog tenant key (`iq_tenant_id`) vs platform UUID tenant

- **Status:** Proposed
- **Date:** 2026-05-08
- **Deciders:** Platform architecture
- **Informed:** All services sending `iq_tenant_id` to Master Data

## Context and problem statement

Master Data Visitpad and `tenant_master` platform tables currently persist a **positive 32-bit integer** catalog tenant key and accept the same in the **`iq_tenant_id`** HTTP header. Elsewhere in the repo, `packages/ts-sdk-db` defines **`iq_tenant_id` as UUID** for generic tenant-scoped application tables. That mismatch breaks header reuse, co-location assumptions, and mental models (see PR #40 review).

## Decision drivers

- **Citus:** distribution keys should align across modules that join or co-locate by tenant.
- **Ergonomics:** one header name should mean one type to callers.
- **Pre-production:** schema is still wipe-friendly; correcting typing is cheaper now than after multi-module wiring.

## Considered options

1. **(a) Align Master Data to UUID** for `tenant_master` / header / JSON — single platform tenant type (recommended long-term).
2. **(b) Mapping layer** — header stays UUID; Master Data resolves UUID → integer via Configurator (or similar) with cache.
3. **(c) Document divergence only** — keep integer storage; every caller learns a second tenant identifier.

## Decision outcome

Chosen direction: **(a) align on UUID** when the next coordinated migration window opens; until then the API **rejects non-integer** `iq_tenant_id` shapes, and the **web client blocks Visitpad writes** when the UI tenant id is not numeric to avoid silent writes to `public` (see `services/web/src/lib/api-client.ts`).

**Status remains Proposed** until a migration + OpenAPI + `ts-sdk-db` change lands in one bounded PR.

### Consequences

**Positive:**

- Path (a) removes permanent infrastructure asymmetry.

**Negative / accepted trade-offs:**

- Short term: operators need a **numeric catalog tenant id** (or no tenant) for `tenant_master` edits until UUID alignment ships.

## More information

- LLD: [02-api-contracts.md](../lld/master-data/02-api-contracts.md)
- Dual-schema ADR: [ADR-0020](./0020-master-data-catalog-dual-schema.md)
