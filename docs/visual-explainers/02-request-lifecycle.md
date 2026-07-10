---
title: Anatomy of a request
objective: Trace one authenticated browser API call end-to-end — SPA → BFF gateway → Fastify service → identity → PEP → Cerbos → handler → use-case → Drizzle — and see exactly where each failure short-circuits.
---

One click in the SPA — "record a payment" — crosses eight layers before a row is written. This page follows that single call, `POST /api/billing/v1/payments`, and marks where it can die.

<!-- chapter: The happy path -->

```diagram title="One authenticated call, end to end" look=clean
sequenceDiagram
  autonumber
  participant UI as "React + TanStack Query"
  participant AC as "api-client.ts"
  participant BFF as "BFF gateway"
  participant ID as "identityPlugin (svc)"
  participant PEP as "authzPlugin (PEP)"
  participant CB as Cerbos
  participant H as "handler + use-case"
  participant DB as "Drizzle / Citus"

  UI->>AC: useMutation → recordPayment(input)
  Note over AC: attach Authorization: Bearer JWT<br/>iq_tenant_id + x-tenant-id, credentials: include
  AC->>BFF: POST /api/billing/v1/payments
  Note over BFF: verify JWT (JWKS/RS256)<br/>checkTenantScope → canonicalize headers<br/>set authoritative x-user-id · ban / pwd cutoff
  BFF->>ID: proxy to billing-svc (Bearer passes through)
  Note over ID: verify JWT again → request.user<br/>enrich principal (roles + capabilities)
  ID->>PEP: preHandler — route is authMode: protected
  PEP->>PEP: resolveTarget → {kind, id, action, attr}
  PEP->>CB: CheckResources(principal, resource, action)
  CB-->>PEP: allow
  PEP->>H: run handler
  Note over H: Fastify schema validates body first
  H->>DB: insertPayment — WHERE iq_tenant_id = tenant
  DB-->>H: rows
  H-->>UI: 201 Created
```

The chain is real, not conceptual — every hop maps to a file:

```filetree
. services/web/src/lib/
.   api-client.ts — attaches Bearer + tenant headers, retries once on AUTH_INVALID_TOKEN
. services/bff/src/
.   main.ts — edge JWT verify, tenant-scope assert, header hardening, @fastify/http-proxy
. packages/ts-sdk-identity/src/
.   plugin.ts — onRequest: verify Bearer → request.user
.   verify.ts — JWKS RS256, issuer/audience allowlist, tenant-required (except scope:platform)
. packages/ts-sdk-authz/src/
.   plugin.ts — preHandler PEP: resolveTarget → Cerbos CheckResources → 403
. modules/billing/src/
.   authz/billing-authz-target-resolver.ts — route → Cerbos {kind,id,action}
.   router.ts — POST /services etc., config: authMode protected
.   use-cases/record-payment.ts — pure function, deps injected
.   data-access/billing.repository.ts — every query filters iq_tenant_id
```

<!-- chapter: Where it dies -->

Each guard fails **closed** and returns a typed code. The SPA only auto-recovers from one of them (a stale access token → silent refresh + one retry, `api-client.ts` `fetchWithAuthRetry`).

| Where | Trigger | Response | Source |
|---|---|---|---|
| BFF / service identity | no/garbled `Authorization` | `401 AUTH_MISSING_BEARER` | `ts-sdk-identity/plugin.ts` |
| BFF / service identity | bad or expired JWT | `401 AUTH_INVALID_TOKEN` → SPA refreshes once | `plugin.ts` + `verify.ts` |
| BFF tenant gate | header tenant ≠ principal tenant (non-platform) | `403 TENANT_SCOPE_FORBIDDEN` | `bff/src/main.ts` `checkTenantScope` |
| BFF status cutoff | user banned/deactivated after token issue | `401 USER_INACTIVE` | `bff/src/main.ts` |
| BFF status cutoff | admin forced a password change | `403 PASSWORD_CHANGE_REQUIRED` | `bff/src/main.ts` |
| Route (Fastify) | body fails JSON schema | `400 Bad Request` | `billing/src/router.ts` schema |
| PEP (Cerbos) | policy denies the action | `403 AUTHZ_FORBIDDEN` | `ts-sdk-authz/plugin.ts` |

```callout tone=info title="How the PEP knows what to ask Cerbos"
A route opts in with `config: { authMode: "protected" }`. The PEP's `preHandler` then calls the service's **target resolver** to turn the HTTP route into a Cerbos question. `modules/billing/src/authz/billing-authz-target-resolver.ts` is a plain lookup table — no policy logic lives in the handler.
```

```code lang=ts file=modules/billing/src/authz/billing-authz-target-resolver.ts
const ROUTE_TABLE: Record<string, RouteHandler> = {
  "GET /services":  tenantScoped("tariff_master", "list", "tariff-master.read"),
  "POST /payments": tenantScoped("billing_account", "new", "billing-account.create"),
  "GET /bills/:bill_id": pathIdScoped("invoice", "invoice.read", "bill_id"),
};
// tenantScoped adds attr { iq_tenant_id: request.tenantId } — Cerbos sees the tenant too.
```

```callout tone=decision title="Fail-fast on missing mappings"
`authzPlugin`'s `onReady` hook probes `resolveTarget` for **every** `protected` route at boot. A route marked protected with no table entry throws `AuthZ mapping incomplete: <route>` and the service refuses to start — you cannot ship a protected endpoint that silently skips the PEP.
```

<!-- chapter: The S2S variant -->

Service-to-service calls carry **no end-user JWT** (e.g. billing fetching a tenant's bill-number config from configurator). These routes are added **narrowly** to the service's `skipPathPrefixes` and each self-gates on a shared secret header.

```diagram title="Internal route — identity skipped, key-gated" look=clean
sequenceDiagram
  participant B as "billing-svc"
  participant CFG as "configurator-svc"
  B->>CFG: GET /api/configurator/v1/internal/tenants/:id/sequence-config
  Note right of B: header x-configurator-internal-key
  Note over CFG: path matches skipPathPrefixes<br/>→ JWT identity SKIPPED<br/>assertConfiguratorInternalAccess: key == expected?
  CFG-->>B: { tenant_numeric_code, identifier_overrides }
```

The skip list is explicit — `modules/configurator/src/http/configurator-identity-skip-paths.ts` lists `/api/configurator/v1/internal/` (plus a few explicitly-named integration-profile and branding routes), and `assert-configurator-internal-access.ts` rejects a mismatched `x-configurator-internal-key` with `403 FORBIDDEN`.

```callout tone=warning title="Never blanket-skip /internal"
An internal route that is skipped from identity but forgets its own key gate is an open door. The two must move together: add the exact prefix to `skipPathPrefixes` **and** call the `assert…InternalAccess` guard in the handler. Some `/internal/*` routes are JWT-protected diagnostics — do not widen the skip prefix to cover them.
```

<!-- chapter: Two things the code says that the docs don't -->

```callout tone=risk title="The BFF is NOT a cookie→Authorization token handler on this branch"
ADR-0018 / older notes describe a "BFF Token Handler" that swaps an httpOnly cookie for an `Authorization` header. **The code on `dev--improved-v1` does not do this.** The SPA holds the access token in `useAuthStore` and sets `Authorization: Bearer …` itself (`api-client.ts` `buildRequestHeaders`); the BFF (`services/bff/src/main.ts`) only *verifies* that token at the edge and proxies via `@fastify/http-proxy`. The httpOnly cookie is used solely for the **refresh** call to `/api/auth`. Code wins — treat the BFF as a verifying gateway, not a token translator.
```

```callout tone=info title="The JWT is verified twice"
`identityPlugin` runs at the **BFF edge** (`ENABLE_AUTH=true`) and **again inside the service** (`billing-svc/src/main.ts` registers `identityPlugin` too). The edge verify hardens `x-user-id` / tenant headers for the polyglot backends; the in-service verify re-establishes `request.user` for the PEP. Direct-to-service traffic that bypasses the BFF still gets identity + Cerbos — the edge is defense-in-depth, not the only check.
```
