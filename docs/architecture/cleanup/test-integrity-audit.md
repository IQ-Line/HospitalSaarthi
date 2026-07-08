# Test-integrity audit — dev--improved-v1 (2026-07-08)

Adversarial sweep of the branch's tests for the "papering-over" failure mode: green
tests that prove little. Each finding = a test that stays green even if the code-under-test
breaks. Raw auditor output captured here first (durable); **verification + fixes tracked in
the Status column** as I challenge each finding against the real code.

Legend: ⬜ raw/unverified · ✅ verified-real (fixed) · ❌ verified-false (auditor wrong) · 🔧 fixing

---

## Cluster 2 — TS service / package / web unit tests

Recurring pattern: **local re-implementation of guard/schema logic instead of importing the SUT**
(a test that mirrors the production logic proves the mirror, not the code).

| # | Location | Defect | Sev | Status |
|---|----------|--------|-----|--------|
| 2.1 | `services/web/test/unit/routes/login.sign-in.test.ts:5-27` | Test defines its own inline `signInSchema` + manual `.trim().toLowerCase()`; imports **nothing** from `src`. Real `signInSchema` (login.tsx:24, non-exported) + lowercase-in-`handleSignIn` (login.tsx:95) never exercised. If login re-accepts email or drops lowercasing, test stays green (tests zero production code). | high | ⬜ |
| 2.2 | `services/web/test/unit/lib/route-authorization.test.ts:17-23` | `rolesBeforeLoad` re-implements the `user-management/roles` route guard inline instead of importing the route's real `beforeLoad`; capability set + `/dashboard` redirect duplicated. (Sibling `userDetailBeforeLoad` is fine — uses real `requireCapability`.) | med | ⬜ |
| 2.3 | `services/web/test/unit/components/capability-gate.test.ts:5-21` | `gateAllowed` re-implements CapabilityGate all>any>single precedence locally via non-hook helpers; real component's `anyOf`/`allOf` aliases (capability-gate.tsx:21-27) never touched. | low | ⬜ |
| 2.4 | `services/user-management-svc/test/unit/openapi/capability-response-validation.test.ts:28` | Happy-path only: asserts valid payload → `true`, never asserts invalid → `false`. A validator degraded to always-accept stays green. | low | ⬜ |

**Clean (spot-checked, meaningful):** `services/bff/.../active-status-check.test.ts` (exemplary — fail-open, TTL, eviction, timeout-abort, log levels); user-management-svc authz-target-resolver/adapters/phase-1a-smoke; configurator-svc http-platform-module-catalog-client (non-2xx, malformed, empty-catalog floor); empi-svc identity-authz-wiring (401/skip matrix); many web api/permissions tests assert real values + negative branches. No render()-without-assertion FE tests.

---

## Cluster 1 — TS module unit tests (domain / use-cases / lib)

Suite broadly strong (most files assert values, mapped shapes, arg payloads, guard+success branches; `create-intake-for-new-patient`, `reset-user-password`, `create-care-context`, `handle-link-confirm-callback` exemplary). Few genuinely green-but-hollow:

| # | Location | Defect | Sev | Status |
|---|----------|--------|-----|--------|
| 1.1 | `modules/user-management/test/unit/data-access/principal-authorization-repository.snapshot.test.ts:25` | Wrong-thing assertion: name promises "reads user_capabilities only, not live role_capabilities" but sole guard is `expect(selectCallCount).toBe(1)`. `chain.from()` mock ignores its table arg, so a regression reading a live `role_capabilities` JOIN (still one select) stays green; `where()` returns a pre-baked clean row so trim/dedup/sort never runs. | med | ⬜ |
| 1.2 | `modules/integration-hub/src/integrations/abdm/use-cases/m3/hiu/get-consent-artefact-records.test.ts:44` | Happy-path-only: only the `!isConsentHealthDataAccessible → null` guard runs. Value path (consentId filter, per-artefact build, `artefactHipName`, the `consentId && targets.length===0 → null` branch at SUT:54) never exercised. | med | ⬜ |
| 1.3 | `modules/integration-hub/src/integrations/abdm/use-cases/m3/hiu/get-m3-attachment.test.ts:50` | Happy-path-only: all 4 tests force null (`listForRequest` always `[]`). Core `entryContentMatchesBundle` matching + `extractAttachmentContent` mapping never run; a break leaves all four `toBeNull()` green. | med | ⬜ |
| 1.4 | `modules/integration-hub/test/unit/integrations/abdm/lib/abdm-signature-verifier.test.ts:23` | Security-critical: only the reject path (missing issuer/audience in prod → false) tested; the signature-valid → `true` path never asserted, so an always-false (or always-true off-prod) verifier passes. Possibly covered by integration — confirm. | low | ⬜ |

**Clean:** user-management domain/use-cases, empi dedup/register, registration intake saga, pharmacy lib/use-cases, m1 request-builders, event-publish/envelope tests — all meaningful. Pure one-line delegations excluded per trivial-passthrough rule.
