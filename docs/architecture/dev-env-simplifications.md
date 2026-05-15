# Phase 0/1 Dev-Environment Simplifications

**Status:** Active for the Phase 0 → Phase 1 build. Pre-prod gate before any tenant goes live.
**Last updated:** 2026-05-13
**Audience:** developers, tech lead, EM.

This document is the single source of truth for the temporary simplifications that loosen Phase 0/1 development to match the very tight POC timeline (existing-production functional parity, not non-functional posture). Each item has an explicit pre-prod gate — these are not permanent deviations from the architecture.

Three knobs and one tag legend.

---

## 1. Citus distribution toggle — `HIMS_CITUS_ENABLED`

**Problem:** Citus is a PostgreSQL extension that requires a separate Docker image and migration step. A developer running plain PostgreSQL locally cannot complete a fresh setup without provisioning Citus first, which is friction we do not want to absorb in week one.

**Solution:** every `create_distributed_table(...)` call sits behind an environment flag. The schema itself does not change — `iq_tenant_id NOT NULL` is on every table either way — only the distribution step is conditional.

**Implementation pattern (Drizzle migration helper):**

```typescript
// packages/ts-sdk-db/src/citus.ts
export async function distributeTable(
  db: Database,
  tableName: string,
  distColumn: string = 'iq_tenant_id',
  options?: { colocateWith?: string }
): Promise<void> {
  if (process.env.HIMS_CITUS_ENABLED !== 'true') {
    console.log(`[citus] skip distribute_table('${tableName}') — HIMS_CITUS_ENABLED=false`);
    return;
  }
  const colocate = options?.colocateWith
    ? `, colocate_with => '${options.colocateWith}'`
    : '';
  await db.execute(
    sql`SELECT create_distributed_table('${sql.raw(tableName)}', '${sql.raw(distColumn)}'${sql.raw(colocate)})`
  );
}
```

Every module's migration script ends with a block of `distributeTable(...)` calls. The block is a no-op locally; a real Citus cluster runs it.

**Where it's set:**
- Local dev `.env`: `HIMS_CITUS_ENABLED=false` (or unset)
- Staging / production: `HIMS_CITUS_ENABLED=true`

**Pre-prod gate:** All staging deployments must run with `HIMS_CITUS_ENABLED=true`. A CI check verifies that every distributed-table migration has its corresponding `distributeTable(...)` call (so a developer cannot silently forget the distribution).

**What this does NOT compromise:** the schema is identical between dev and prod. Queries that work against vanilla PostgreSQL also work against Citus (you just lose cross-shard parallelism). The `iq_tenant_id` filter on every query is still mandatory — review enforces it.

---

## 2. Cerbos PEP stub-mode — `PERMISSIVE_MODE`

**Problem:** Cerbos requires a sidecar process or a remote PDP. For a developer who wants to run `npx nx run opd-svc:serve` and make API calls, the Cerbos dependency is yet another moving part.

**Solution:** every PEP middleware honours a `PERMISSIVE_MODE` flag. When set, the PEP **logs** the would-be Cerbos request (resource, action, principal) but **does not enforce** the decision — every request passes the authorization check.

**Implementation pattern:**

```typescript
// packages/ts-sdk-authz/src/pep.ts
export function cerbosPep(opts: PepOptions): FastifyHook {
  return async (request, reply) => {
    const principal = buildPrincipal(request);
    const resource = opts.resource(request);
    const action = opts.action;

    if (process.env.PERMISSIVE_MODE === 'true') {
      request.log.warn(
        { principal_id: principal.id, resource_kind: resource.kind, action, hims_permissive: true },
        'PERMISSIVE_MODE: skipping Cerbos check'
      );
      return; // allow
    }

    const decision = await cerbosClient.checkResource({ principal, resource, action });
    if (!decision.isAllowed(action)) {
      throw new ForbiddenError(decision);
    }
  };
}
```

**Where it's set:**
- Local dev `.env`: `PERMISSIVE_MODE=true`
- Staging / production: `PERMISSIVE_MODE=false` (or unset)
- CI: `PERMISSIVE_MODE=false` for any test that exercises authorization paths

**Pre-prod gate:** the staging deployment runs with `PERMISSIVE_MODE=false` and the real Cerbos sidecar. The Cerbos policies for every module must be authored and verified in staging before that module's first production tenant. The CI permissions-suite runs against the real PDP, never permissive.

**What this does NOT compromise:** the JWT validation in the BFF and the identity adapter still runs. `request.user` is still populated. Tenant context (`iq_tenant_id`) is still extracted and required on every request. Only the *policy decision* is bypassed — the *principal identification* is unchanged.

---

## 3. Lenient OpenAPI request validation — `STRICT_SPEC_VALIDATION`

**Problem:** the platform is spec-first ([ADR-0016](./adr/0016-polyglot-nx-monorepo-spec-first-contracts.md)) — handlers are derived from the OpenAPI specs in `specs/openapi/*.yaml`. Strict request-body validation against the spec catches drift but adds a debugging loop that the team does not need under POC pressure.

**Solution:** during Phase 0/1, the spec stays authoritative for *contract documentation and client SDK generation* but request bodies are accepted as long as they match the *Fastify route schemas* (which devs write directly). Strict spec-conformance validation is enforced in CI on a nightly schedule (drift is visible) but does not block PR merge or local dev.

**Implementation pattern:** the OpenAPI-to-Fastify glue layer has a strict-mode flag.

```typescript
// packages/ts-sdk-http/src/spec-validation.ts
if (process.env.STRICT_SPEC_VALIDATION === 'true') {
  app.register(strictSpecMiddleware, { spec: './specs/openapi/billing.v1.yaml' });
}
// otherwise: only Fastify schema validation runs (lighter, dev-friendly)
```

**Where it's set:**
- Local dev / PR CI: `STRICT_SPEC_VALIDATION=false`
- Nightly CI / staging / production: `STRICT_SPEC_VALIDATION=true`

**Pre-prod gate:** the staging deployment runs with `STRICT_SPEC_VALIDATION=true` and the nightly CI job is green before production cutover. If a drift is detected in nightly CI, it is a P1 fix.

**What this does NOT compromise:** request-body validation is *not* disabled — Fastify schemas still run. Only the spec-vs-Fastify drift check is deferred. The OpenAPI specs remain the source of truth for client SDKs and external integrators.

---

## 4. Defer-until-needed tag legend

Every dev-guide step in `docs/architecture/lld/<module>/dev-guide.md` is tagged with one of three priorities. This lets a dev triage when the sprint slips.

| Tag | Meaning | Examples |
|---|---|---|
| **[REQUIRED FOR DEMO]** | Cannot be skipped. The Phase 1 demo / production-parity flow fails without it. | OPD finalize-consultation, billing record-payment, EMPI patient find-or-create, ABDM M1 OTP roundtrip. |
| **[DEFER IF TIME-CONSTRAINED]** | Strongly recommended but the demo can survive without it. Add immediately post-demo. | Idempotency-Key enforcement on charge-ingest, receipt PDF generation server-side, Cerbos policies for billing admin actions. |
| **[POST-DEMO]** | Not in scope for Phase 1. Listed in dev-guide for completeness but explicitly off the critical path. | Doctor commission accrual, payment-plan reminder loop, fancy retry observability. |

**How to apply:** a step without a tag is `[REQUIRED FOR DEMO]` by default (this is the safest interpretation). Dev-guide authors should explicitly tag the deferrable steps.

The PR review checklist asks: "Does every step on the critical path carry [REQUIRED FOR DEMO] (explicitly or by default)? Are all [DEFER IF TIME-CONSTRAINED] items captured as follow-up issues?"

---

## Summary

| Knob | Local dev | Staging | Production | Pre-prod gate |
|---|---|---|---|---|
| `HIMS_CITUS_ENABLED` | `false` | `true` | `true` | CI check on every migration |
| `PERMISSIVE_MODE` | `true` | `false` | `false` | Cerbos policies authored + staging-verified per module |
| `STRICT_SPEC_VALIDATION` | `false` | `true` | `true` | Nightly CI green |
| Defer tags | n/a | n/a | n/a | All [DEFER IF TIME-CONSTRAINED] items have follow-up issues |
| `env:` secrets (HLD 05 §7.3) | allowed | allowed-with-warning | **migrated to real store** | per-tenant secret-store provisioning |
| Audit consumer (ADR-0024) | n/a | live + verified | live + verified | end-to-end staging verification |

The pre-prod gate is one checklist, owned by the architect (spec), EM (sprint allocation), and tech lead / DevOps (verification). Two-week staging dogfooding minimum before first prod tenant.

These knobs exist so devs can ship Phase 1 fast. They are not a permanent posture, and the pre-prod gate is non-negotiable.
