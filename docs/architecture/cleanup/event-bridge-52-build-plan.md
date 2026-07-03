# #52 — Event-bridge facade (D8 HTTP-first) + ports/adapters (D3): recon + scoping

> **Status: recon done (2026-07-02), scope decision PENDING user nod.** Read this first on resume.
> Durable recon output: the workflow result for `wyodm0y9t` (5 Explore agents).

## TL;DR — the recon changed the picture

**"#52 as literally titled" — the async event-bridge facade (`/internal/events` cross-process
receiver + merging `py-sdk-events` PR #31 + the 10-event catalog) — is the documented Phase-5
slice that decision D8 explicitly DEFERS.** Building it now would (a) contradict a ratified
decision, (b) be premature (no cross-module event volume; the app has never gone live), and (c)
likely be rebuilt when a real broker lands. So the async bridge is NOT the actionable work.

**What IS actionable and D8/D3-aligned = closing the two cross-schema "reach-ins" with HTTP-first
ports + hand-written adapters.** Of the two, only ONE is a clean HTTP+cache candidate now.

## Ground truth (recon)

**Current event bus (TS):** `@hims/ts-sdk-events` `InProcessEventBus` (ADR-0017) — in-process only,
one bus per service, strict snake_case envelope (`event_type = <module>.<entity>.<action>`,
`iq_tenant_id`), `validateEnvelope` on publish. The `EventBus` interface IS already the port;
`createEventBus({type:'in-process'})` factory exists (only in-process adapter). No outbox / broker /
HTTP transport. Modules depend on `EventBus` via DI.

**Cross-service reality:** each module ships as its own service, so in-process subscriptions are
effectively **dangling across process boundaries**. Only two producer→consumer edges have a coded
subscriber (configurator→UM entitlement cache; record-foundation→integration-hub M2), and the
configurator→UM one is actually propagated over **HTTP** (`HttpUserManagementEntitlementCacheInvalidator`),
NOT the bus. Everything else is an orphan/dangling producer. Python (opd/master-data) emits **no
events**; `py-sdk-events` (PR #31) is unmerged (only stale `.pyc` on this branch). Python→TS today =
synchronous outbound HTTP (httpx).

**Decisions (master-map decision register):**
- **D8 (2026-06-22): HTTP-first for Phase 1.** Sync cross-module calls go via ports+adapters (D3);
  the event-bridge facade (`/internal/events`) is the **Phase-5** slice + documented durable target;
  events stay intra-process (ADR-0017) until then.
- **D3 (2026-06-22): ports + hand-written HTTP adapters** (NOT generated openapi-clients). Reference:
  integration-hub's `ConfiguratorHttpIntegrationProfileRepo`. (Load-bearing: amend ADR-0016.)

**The two reach-ins (both READ-only cross-schema):**
1. **configurator → `master_global.modules`** — `modules/configurator/src/use-cases/list-entitlement-enabled-module-ids.ts:35,64`
   JOINs master-data's `master_global.modules` (needs only `id`, `is_deleted`) to drop orphan/deleted
   `tenant_modules` for the S2S entitlement-hydration route (`GET /internal/tenants/:id/enabled-module-ids`,
   `x-um-internal-key`-guarded). **Its OWN LLD forbids this** (`configurator/01-schema-design.md:378`
   "the Configurator never queries `master_data.*` directly"; rated HTTP+cache, NOT a projection).
   → **Clean D8 HTTP-first fix. This is the actionable #52 slice.**
2. **opd → `registration.visit` / `registration.registration`** — `modules/opd/src/opd/data_access/registration_patient_source.py`,
   `models/registration_visit.py`, etc. Reads visit + patient demographics on the **clinical hot
   path** (prescription is 1:1 with a registration visit). The model docstrings already say "until an
   event projection or generated client replaces this coupling." Recon: meets all **4 projection
   criteria** (hot path, local JOIN, survive-outage, eventual-consistency-OK) → the CORRECT fix is an
   **event-fed projection**, which needs the event bridge = **Phase 5**. Forcing HTTP+cache now (on a
   hot path that should be a projection) would be premature and rework-prone. → **DEFER to Phase 5.**

## Recommended scope for #52 (now)

**Close reach-in #1 only (configurator → master-data), HTTP-first per D3/D8. Defer reach-in #2
(opd → registration projection) and the async event-bridge facade to Phase 5.**

Rationale: #1 aligns code with its own LLD, is bounded, and establishes the reusable D3
port+adapter+cache pattern. #2 is genuinely a projection candidate that needs the bridge; doing it
now via HTTP would build the wrong shape. The async bridge itself is D8-deferred. This is the
disciplined "do the actionable HTTP-first slice, don't prematurely build the deferred async parts."

### Design for reach-in #1 (configurator → master-data module catalog)

Wrinkle introduced by Phase 4b: **master-data `GET /modules` is now identity-gated** (JWT required).
A S2S entitlement-hydration call (triggered by UM, no end-user JWT guaranteed) can't just call it.

Fix has 3 parts:
1. **master-data**: expose a NARROW internal S2S route for the module catalog (e.g.
   `GET /internal/modules` → `[{id, is_deleted}]` or an id-set), gated by an internal key
   (`x-*-internal-key`) and added NARROWLY to the `IdentityGateMiddleware` public prefixes (per the
   `internal-route-identity-skip` pattern — never blanket `/internal`).
2. **configurator**: a `PlatformModuleCatalogPort` (`ports.ts`) + hand-written
   `HttpPlatformModuleCatalogClient` adapter (D3) calling that route, with a **TTL cache** (module
   catalog is admin-tier, changes rarely; event-bust is unavailable until the bridge exists, so
   TTL-only is acceptable and documented).
3. Rewrite `list-entitlement-enabled-module-ids.ts` to fetch the cached catalog and filter in-memory
   (drop orphan/deleted module_ids) instead of the `master_global` JOIN. Keep the `UPDATE` of
   configurator's OWN `tenant_modules` unchanged. Verify the fail-closed-vs-fail-open behavior of the
   orphan filter is preserved (today it drops unknown ids so UM entitlement can't fail-closed).

Verify end-to-end (both services), adversarial review, then commit. Estimated: one focused phase.

## Deferred (Phase 5, tracked — NOT this task)
- opd → registration **event-fed projection** (needs the bridge).
- the **async event-bridge facade**: merge `py-sdk-events` (PR #31), build `/internal/events`
  cross-process receiver, reconcile the 10-event catalog (#30), fix dangling cross-pod subscriptions.
- broker adapter (`NatsEventBus`/`KafkaEventBus`) — deferred ADR, when volume justifies.
