# ADR-0036: `pdf-platform` is the report service; HIMS consumes ONE contract generated from its schema

- **Status:** Accepted — staged migration in progress
- **Date:** 2026-07-08 (revised from the initial "vendor as git submodule" slice)
- **Deciders:** Architect, Engineering Manager, Tech Lead
- **Consulted:** Registration module owner, OPD module owner
- **Informed:** Whole engineering team

## Context and problem statement

External PDF/report rendering in this monorepo is served by **`pdf-platform`** (GitHub `IQ-Line/smart-report-v2`), a separate Turborepo/pnpm service running Fastify + Gotenberg that owns the report templates. HIMS talks to it over HTTP. That it is the report service is settled. The problem is that HIMS currently **hand-reimplements the client and templates three ways**, and they have drifted:

1. **TypeScript client** — `packages/pdf-client/` (`HttpPdfPlatformRenderer` + a hand-written `types.ts` mirroring pdf-platform's Zod DTOs). Used by `modules/registration`.
2. **Python client** — `modules/opd/src/opd/lib/pdf_platform_client.py` (a second hand-written HTTP client) plus a dead legacy self-HTML path in `modules/opd/src/opd/integrations/op_consult_report.py`.
3. **Scraped templates** — `tools/extract-opd-report-templates.mjs` line-slices `reportTemplates.ts` out of a sibling repo (`hims-frontend-ai-based`) into `packages/registration-reports/src/opd-templates.generated.ts`. pdf-platform independently scrapes the **same** upstream into `packages/report-opd-slip/src/generated/opd-templates.generated.ts` — so the OPD-slip/receipt HTML now exists, separately maintained, on **both** sides.

pdf-platform's `packages/contracts` (all Zod) is the single source of truth for request shapes, but **nothing in HIMS is generated from it** — the TS interfaces and the Python `dict` builders are copied by hand. Because every server schema is `.strict()`, any drift becomes a runtime 400, not a compile error.

## What pdf-platform actually is (verified against the clone, branch `dev`)

**pdf-platform renders from structured DATA server-side — it is not merely an HTML→PDF box.** Entry points (`packages/report-engine/src/routes.ts`, `apps/pdf-worker/src/routes/`):

- **`POST /v1/pdf/reports/:slug`** (and `…/:slug/html`) — accepts **structured report data**, validates against the report's Zod schema, renders HTML server-side via the `report-*` packages, streams a PDF through Gotenberg. Registered types (`packages/contracts/src/schemas/reports/report-types.ts`): `opd-slip`, `op-consultation`, `immunization`, `prescription`. The response is a streamed `application/pdf` (`apps/pdf-worker/src/services/stream-pdf-from-html.ts`).
- **`POST /v1/pdf/render-html`** — a generic caller-supplies-HTML fallback (`apps/pdf-worker/src/routes/render-html.ts`).

The target end-state — *HIMS sends data, templates live only in pdf-platform* — **is achievable for the four registered types**; the contract was designed around HIMS (`common.ts` documents `smartParchaPageSchema` as "same shape as HIMS `parchaContent`"). The Python clinical side is **already** on the `/reports` data path.

**Two verified facts that shape the decision:**

- **The contract is zod v3.** `@pdf-platform/contracts` depends on `zod ^3.25.42` (resolved `3.25.76`) and its only runtime dependency is `zod`. So (a) a JSON-Schema export uses the **`zod-to-json-schema`** library — zod v4's native `z.toJSONSchema()` does not apply — and (b) that export script runs against `packages/contracts` **in isolation** (just `pnpm install` + `tsc --build`), independent of Gotenberg/Fastify/renderers. This is the clean CI seam.
- **`opd-receipt` is not a report type yet.** The OP-billing receipt template (`renderOPBillingHtml`, `packages/report-opd-slip/src/generated/opd-templates.generated.ts`) exists but has **no slug, schema, or renderer registration**, and is not exported from the package index. Its input (`OPDBillingReportPayload`, `packages/report-shared/src/types.ts`) is a *presentation* shape with a pre-computed `summary` — but pdf-platform already ships `computeOPDBillingSummary` (`packages/report-shared/src/billing-math.ts`), so a clean contract can accept **raw line items + discounts** and compute the summary server-side.

## Decision

**Consolidate HIMS onto a single report contract that is GENERATED from pdf-platform's exported JSON-Schema and gated against drift in CI. Do NOT vendor pdf-platform as a git submodule.**

Concretely:

1. **pdf-platform exports a language-neutral schema artifact.** Add a small script to `@pdf-platform/contracts` that emits a JSON-Schema bundle of the report request DTOs (via `zod-to-json-schema`), committed into the repo. This artifact — not the Zod source, not a TS `.d.ts` — is the polyglot source of truth.
2. **pdf-platform exposes `opd-receipt`** as a first-class report type (slug + Zod schema + a renderer wrapping the existing `renderOPBillingHtml`, computing the summary server-side via `billing-math.ts`), so HIMS can retire its scraped receipt template. This is coupled to (1) — the export must include the new receipt schema — so both land in **one upstream PR**.
3. **HIMS generates its clients' types from that artifact.** A `make` target pulls the JSON-Schema bundle and runs `json-schema-to-typescript` (→ `packages/pdf-client`) and `datamodel-code-generator` (→ the Python client), writing **committed** files. Regenerating-from-schema kills drift by construction.
4. **CI has a contract drift-gate.** Regenerate in CI and fail if the committed generated files differ from the fresh output — the guarantee the submodule was reaching for, without coupling every CI job to a private-repo checkout.
5. **`make dev` clones + runs pdf-platform locally** for end-to-end rendering — into the **gitignored** `external/pdf-platform` at a pinned ref, via its docker-compose (it ships Gotenberg). Developers who never touch reports never clone it.
6. **Retire the three hand-reimplementations** (see migration plan). Templates live only in pdf-platform; HIMS sends structured data.

### Why generated-from-schema, not a git submodule

The initial slice (reverted) vendored pdf-platform as a submodule at `external/pdf-platform` and wired `git submodule update` into `make setup`. Rejected in favour of the above because the submodule:

- **Only helps the TypeScript half.** Python cannot import Zod/TS types; it would still hand-copy the contract, so drift persists on the OPD side — the worse of the two. A JSON-Schema artifact is language-neutral and feeds **both** `json-schema-to-typescript` and `datamodel-code-generator`.
- **Couples CI to a private-repo checkout.** `smart-report-v2` is private; every affected CI job (and every fresh clone) would need submodule credentials and an init step. The schema artifact is a committed file — no private checkout in the common case; only the (rare) drift-gate job and `make dev` touch the upstream repo.
- **Is the highest-friction option for the guarantee it buys.** A submodule pins a commit but does not *verify* the HIMS side matches it — you can still hand-write a drifting `types.ts` against a pinned submodule. The drift-gate verifies the actual generated types against the actual current schema, which is the real guarantee.

Trade-off accepted: HIMS depends on the upstream repo emitting and versioning the schema artifact (a coordinated change, done here), and full "data-only, no templates in HIMS" needs the upstream `opd-receipt` type. Both are within our control (same org, write access).

## Current HIMS ↔ pdf-platform mapping (what each report uses today)

| HIMS report | Producer | Path used **today** | Data-driven type on pdf-platform? |
|---|---|---|---|
| OPD slip (partner API) | `modules/registration` `render-partner-opd-slip-pdf.ts` | **`/v1/pdf/reports/opd-slip`** (data) via `pdf-client.renderOpdSlipReport` | ✅ `opd-slip` |
| OPD slip (internal documents) | `modules/registration` `get-registration-documents.ts` | local `renderOPDSlipHtml` → **`/render-html`** | ✅ `opd-slip` (not used here yet) |
| OPD receipt / OP billing | `modules/registration` `get-registration-documents.ts` | local `renderOPBillingHtml` → **`/render-html`** | ❌ **template exists on pdf-platform but unexposed** |
| Prescription | `modules/opd` `clinical_documents_service.py` | **`/v1/pdf/reports/prescription`** (data) via `pdf_platform_client.py` | ✅ `prescription` |
| OP consultation | `modules/opd` `clinical_documents_service.py` | **`/v1/pdf/reports/op-consultation`** (data) | ✅ `op-consultation` |
| Immunization | `modules/opd` `clinical_documents_service.py` | **`/v1/pdf/reports/immunization`** (data) | ✅ `immunization` |
| OP-consult / OPD-slip health-doc (legacy) | `modules/opd` `integrations/op_consult_report.py` | self-built HTML → `/render-html` | **dead** — no live callers (only two HI-type string constants are imported, by `abdm_m2.py`) |

So the remaining hand-work is: (a) the two hand-written clients, (b) the scraped OPD-slip/receipt templates in `registration-reports` (still live via the registration **internal-documents** path), and (c) the dead legacy Python HTML render functions.

## Migration plan (staged; each stage independently shippable)

**Stage 0 — this ADR + revert the submodule slice.** Remove `.gitmodules`, the `external/pdf-platform` gitlink, and the `git submodule update` in `make setup`; `.gitignore` reserves `/external/` for the `make dev` clone. No behaviour change. *(done)*

**Stage 1 — upstream: schema export + `opd-receipt` (one PR into `smart-report-v2`).**
- Add `zod-to-json-schema` emit script to `@pdf-platform/contracts`; commit a JSON-Schema bundle covering `opd-slip`, `op-consultation`, `immunization`, `prescription`, and the new `opd-receipt`.
- Add the `opd-receipt` report type: slug in `REPORT_TYPES`, a `opdReceiptRequestSchema` (raw line items + discounts + received amount), a renderer that computes the summary via `billing-math.ts` and calls `renderOPBillingHtml`, plus route/bootstrap registration.
- Verify: existing report tests green; the emitted bundle validates a sample of each type.

**Stage 2 — HIMS codegen + drift-gate.** `make gen:report-contracts` fetches the bundle (from the pinned upstream ref) and regenerates `packages/pdf-client` types (`json-schema-to-typescript`) and the Python client models (`datamodel-code-generator`) into committed files. CI regenerates and fails on any diff. Delete the hand-written `pdf-client/src/types.ts` interfaces and the hand-built Python `dict` shapes in favour of the generated types (the Python client keeps its mandatory `_omit_none` — the `.strict()` schemas reject JSON `null` on optionals — and its slug map).

**Stage 3 — move registration onto typed endpoints.** Switch `get-registration-documents.ts` from local-HTML `renderOpdSlipDocumentHtml`/`renderOpdReceiptDocumentHtml` + `/render-html` to structured `/v1/pdf/reports/opd-slip` and `/v1/pdf/reports/opd-receipt`. The receipt summary computation (`computeOPDBillingSummary` and the `build-opd-receipt-payload.ts` helpers) moves **server-side** into the new upstream renderer; HIMS sends raw billing data. Correctness gate: smoke-render each produces a valid PDF (pre-production, malleable — no pixel-parity-vs-old requirement).

**Stage 4 — retire the scrape and dead code.** Delete `tools/extract-opd-report-templates.mjs`, `packages/registration-reports/` (relocating its few non-template exports — logo data URL, patient-name-line helper — into `modules/registration` if still needed), the `render*DocumentHtml` wrappers, and the dead render functions in `op_consult_report.py` (keeping only `OP_CONSULT_HI_TYPE` / `OPD_SLIP_HI_TYPE`, which `abdm_m2.py` reads — move them to a small constants module). Verify no remaining importers.

## Consequences

**Positive:** one client per language, both generated from one schema; zero report templates in HIMS; the fragile sibling-repo scrape (on both sides) is deleted; drift is caught mechanically in CI rather than at runtime as a 400; no private-repo checkout in common-case CI.

**Negative / accepted:**
- HIMS depends on the upstream repo emitting + versioning the schema artifact, and on the upstream `opd-receipt` type. Both are in-org, write-accessible, and delivered as part of this work.
- **`op-consultation` codegen is weak by design.** `opConsultationRequestSchema` types most clinical arrays as `z.record(z.unknown())`, so generated types are `Record<string, unknown>` / `dict[str, Any]` — no stronger than today. Codegen buys real typing for `opd-slip`, `prescription`, `immunization`, `opd-receipt`, not for op-consultation's clinical blobs.
- **pdf-platform enforces no auth today.** Both clients send an `Authorization: Bearer <apiKey>` the server ignores (verified: the only `onRequest` hook is request-id). Not a functional blocker; flagged so that if a gateway later enforces it, the server needs a matching plugin. The consolidation preserves the client's ability to send the header.

## Verification (Stage 0)

- `git submodule status` → empty; `.gitmodules` removed; `external/pdf-platform` gitlink removed; `.git/modules/external/pdf-platform` purged.
- `make setup` no longer runs `git submodule update`; `.gitignore` ignores `/external/`.
- No report/client/template code changed by this stage.

## Links

- Upstream: `IQ-Line/smart-report-v2` (branch `dev`) — schema export + `opd-receipt` (Stage 1).
- pdf-platform evidence: `packages/contracts/src/schemas/reports/*` (zod v3), `packages/contracts/package.json` (deps = zod only), `packages/report-engine/src/routes.ts` (slug maps), `apps/pdf-worker/src/routes/register-report-routes.ts`, `apps/pdf-worker/src/bootstrap/register-reports.ts`, `packages/report-opd-slip/src/generated/opd-templates.generated.ts` (`renderOPBillingHtml`), `packages/report-shared/src/billing-math.ts` (`computeOPDBillingSummary`), `apps/pdf-worker/src/services/stream-pdf-from-html.ts`.
- HIMS evidence: `packages/pdf-client/src/*`, `modules/registration/src/use-cases/render-partner-opd-slip-pdf.ts`, `modules/registration/src/use-cases/get-registration-documents.ts`, `modules/registration/src/lib/registration-reports.ts`, `modules/registration/src/use-cases/build-opd-receipt-payload.ts`, `modules/opd/src/opd/lib/pdf_platform_client.py`, `modules/opd/src/opd/services/clinical_documents_service.py`, `modules/opd/src/opd/integrations/op_consult_report.py`, `tools/extract-opd-report-templates.mjs`, `packages/registration-reports/src/opd-templates.generated.ts`.
- Related: [ADR-0034 — Polyglot boundary freeze](./0034-polyglot-boundary-freeze.md), [ADR-0016 — Polyglot Nx monorepo, spec-first contracts](./0016-polyglot-nx-monorepo-spec-first-contracts.md).
