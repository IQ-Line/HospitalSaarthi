# ADR-0036: External `pdf-platform` as the report-rendering service; consolidate onto its contract

- **Status:** Accepted (first slice) — migration plan pending orchestrator/team sign-off
- **Date:** 2026-07-08
- **Deciders:** Architect, Engineering Manager, Tech Lead
- **Consulted:** Registration module owner, OPD module owner
- **Informed:** Whole engineering team

## Context and problem statement

External PDF/report rendering in this monorepo is served by **`pdf-platform`** (GitHub `IQ-Line/smart-report-v2`), a separate Turborepo/pnpm service that runs Fastify + Gotenberg and owns the report templates. HIMS talks to it over HTTP. The problem is not *whether* to use it — that is settled — but that HIMS currently **hand-reimplements the client and the templates three different ways**, and those implementations have drifted:

1. **TypeScript client** — `packages/pdf-client/` (`HttpPdfPlatformRenderer`, hand-written `types.ts` mirroring pdf-platform's Zod DTOs). Used by `modules/registration`.
2. **Python client** — `modules/opd/src/opd/lib/pdf_platform_client.py` (a second hand-written HTTP client) plus a legacy self-HTML path in `modules/opd/src/opd/integrations/op_consult_report.py`.
3. **Scraped templates** — `tools/extract-opd-report-templates.mjs` line-slices `reportTemplates.ts` out of a sibling repo (`hims-frontend-ai-based`) into `packages/registration-reports/src/opd-templates.generated.ts`. pdf-platform scraped the **same** source into `packages/report-opd-slip/src/generated/opd-templates.generated.ts` — so the OPD-slip/receipt HTML now exists, independently maintained, on **both** sides.

The contract (`packages/contracts` on pdf-platform, all Zod) is the single source of truth for request shapes, but nothing in HIMS is generated from it — both the TS `types.ts` and the Python `dict` builders are copied by hand and can silently fall out of sync (the `.strict()` schemas turn any drift into a 400 at runtime).

## What pdf-platform actually is (verified against the clone, commit `56e603f`, branch `dev`)

**pdf-platform renders from structured DATA server-side — it is not merely an HTML→PDF box.** Two public entry points exist (`packages/report-engine/src/routes.ts`, `apps/pdf-worker/src/routes/`):

- **`POST /v1/pdf/reports/:slug`** (and `…/:slug/html`) — accepts **structured report data**, validates it against the report's Zod schema (`opdSlipRequestSchema`, `opConsultationRequestSchema`, `immunizationRequestSchema`, `prescriptionRequestSchema`), then renders HTML **server-side** via the `report-*` packages and streams a PDF through Gotenberg. Registered report types (`packages/contracts/src/schemas/reports/report-types.ts`): `opd-slip`, `op-consultation`, `immunization`, `prescription`. Evidence: `apps/pdf-worker/src/routes/register-report-routes.ts` → `buildRenderHtmlRequestForReport` → `getReportRenderer(type).render(data)`.
- **`POST /v1/pdf/render-html`** — a generic HTML→PDF fallback (caller supplies HTML). Evidence: `apps/pdf-worker/src/routes/render-html.ts`.

So the target end-state — *HIMS sends data, templates live only in pdf-platform* — **is achievable for the four registered report types.** The contract was in fact designed around HIMS: `packages/contracts/src/schemas/reports/common.ts` documents `smartParchaPageSchema` as "same shape as HIMS `parchaContent`" and the OPD-slip schema comments "HIMS sends `parcha.parchaContent`."

**One gap:** the **OPD receipt / OP billing** document has a template on pdf-platform (`renderOPBillingHtml` inside `report-opd-slip/src/generated/opd-templates.generated.ts`) but it is **not wired as a report type** — no slug, no schema, no renderer registration. Retiring HIMS's scraped receipt template therefore requires pdf-platform to *expose* an `opd-receipt` (billing) report type first. Until then the receipt is the one document that must keep a template on the HIMS side (or use `render-html`).

## Decision

1. **Treat `pdf-platform` as the external report service** and vendor it into the monorepo as a **git submodule at `external/pdf-platform`** (`https://github.com/IQ-Line/smart-report-v2.git`), so `clone + make setup` pulls it and it can run locally (it ships Gotenberg via docker). `make setup` now runs `git submodule update --init --recursive`.
2. **Consolidate onto pdf-platform's contract and `report-*` packages.** The end-state is: one TS client and one Python client, each sending **structured data** to `/v1/pdf/reports/:slug`; **zero report templates maintained inside HIMS**; the `tools/extract-opd-report-templates.mjs` scrape and `packages/registration-reports` retired.
3. **The contract is consumed, not copied.** TypeScript consumes `@pdf-platform/contracts` types via the submodule workspace path (or a thin generated `.d.ts`). Python consumes a **JSON-Schema/OpenAPI export** of the same Zod contract (see open questions — pdf-platform does not export one yet).

This is recorded now with only the **zero-risk first slice executed** (submodule + this ADR + Makefile wiring). No client, template, or report flow is changed yet; the migration below is staged and gated on team sign-off.

## Current HIMS ↔ pdf-platform mapping (what each report uses today)

| HIMS report | Producer | Path used **today** | pdf-platform data-driven type? |
|---|---|---|---|
| OPD slip (partner API) | `modules/registration` `render-partner-opd-slip-pdf.ts` | **`/v1/pdf/reports/opd-slip`** (data) via `pdf-client.renderOpdSlipReport` | ✅ `opd-slip` |
| OPD slip (internal documents) | `modules/registration` `get-registration-documents.ts` | `render-html` from **scraped** `renderOPDSlipHtml` | ✅ `opd-slip` (not yet used here) |
| OPD receipt / OP billing | `modules/registration` `get-registration-documents.ts` | `render-html` from **scraped** `renderOPBillingHtml` | ❌ **template exists on pdf-platform but unexposed** |
| Prescription | `modules/opd` `clinical_documents_service.py` | **`/v1/pdf/reports/prescription`** (data) via `pdf_platform_client.py` | ✅ `prescription` |
| OP consultation | `modules/opd` `clinical_documents_service.py` | **`/v1/pdf/reports/op-consultation`** (data) | ✅ `op-consultation` |
| Immunization | `modules/opd` `clinical_documents_service.py` | **`/v1/pdf/reports/immunization`** (data) | ✅ `immunization` |
| OP consult / OPD-slip health-doc (legacy) | `modules/opd` `integrations/op_consult_report.py` | self-built HTML → `render-html` | superseded by the three above; **appears unused** |

Notable: the clinical (Python) side is **already** on the data-driven `/reports` path via `pdf_platform_client.py`. The remaining hand-work is (a) the two hand-written clients, (b) the scraped OPD-slip/receipt templates in `registration-reports`, and (c) a likely-dead legacy HTML path in `op_consult_report.py`.

## Migration plan (staged; each stage independently shippable, gated on sign-off)

**Stage 0 — first slice (executed here, zero-risk):** submodule `external/pdf-platform`, this ADR, `make setup` wiring. No behaviour change.

**Stage 1 — single source for the TS contract.** Point `packages/pdf-client/src/types.ts` at `@pdf-platform/contracts` (via the submodule workspace, or a generated `.d.ts` committed into pdf-client). Delete the hand-copied interfaces. Risk: build/workspace wiring (pnpm must see the submodule package); no runtime change. Verify: registration partner-slip integration test still green.

**Stage 2 — single source for the Python contract.** Add a JSON-Schema (or OpenAPI) export to pdf-platform from the Zod contract (`zod-to-json-schema`), commit it, and validate `pdf_platform_client.py` request bodies against it in tests. Risk: pdf-platform change (coordinate upstream). Verify: `modules/opd/tests/test_pdf_platform_client.py` asserts against the exported schema.

**Stage 3 — move registration internal documents onto `/reports/opd-slip`.** Switch `get-registration-documents.ts` `getOpdSlipPdf` from `renderOPDSlipHtml`+`render-html` to `pdf-client.renderOpdSlipReport` (data). Removes the OPD-slip half of the scrape. Risk: **pixel/layout parity** — pdf-platform's `opd-slip` renderer must reproduce the scraped slip; diff a rendered sample before/after. This is the first flow-changing step and needs explicit approval.

**Stage 4 — expose `opd-receipt` on pdf-platform, then move the receipt.** Upstream: add an `opd-receipt` report type (schema + renderer wrapping the existing `renderOPBillingHtml`) + slug. Then switch `getOpdReceiptPdf` to data. Removes the receipt half of the scrape. Risk: upstream change + billing-math parity (`billing-math.ts` exists on both sides — reconcile to pdf-platform's).

**Stage 5 — retire the scrape and `registration-reports`.** Once Stages 3–4 land, delete `tools/extract-opd-report-templates.mjs`, `packages/registration-reports/`, and the `render*DocumentHtml` wrappers. Verify no remaining importers.

**Stage 6 — remove the legacy Python HTML path.** Confirm `ensure_op_consult_report_pdf_base64` / `ensure_opd_slip_health_document` / `wrap_op_consult_report_document` in `op_consult_report.py` have no live callers (current grep: only the HI-type constants are imported by `abdm_m2.py`; the render functions appear unused) and delete them, keeping the constants.

## Consequences

**Positive:** one client per language, generated from one contract; zero report templates in HIMS; the scrape (a fragile line-slice of a sibling repo) is deleted; drift between the two `opd-templates.generated.ts` copies ends.

**Negative / accepted:** HIMS now depends on a git submodule (extra clone/init step; pinned commit must be bumped deliberately). Stages 3–4 touch live report output and need pixel-parity verification. Stage 2/4 require **coordinated changes in the upstream pdf-platform repo** — HIMS cannot complete full consolidation unilaterally.

**Honest end-state caveat:** full "data-only, no templates in HIMS" is reachable for all six reports **only if** pdf-platform exposes `opd-receipt` and a Python contract export. If upstream declines either, the realistic end-state is narrower: shared TS contract + single TS/Python clients, with the OPD **receipt** template (and only that) remaining on the HIMS side behind `render-html`.

## First-slice verification

- `git submodule status` → `external/pdf-platform` present at `56e603f` (branch `dev`); `git submodule update --init --recursive` exits 0 and is idempotent.
- `.gitmodules` records `external/pdf-platform` → `https://github.com/IQ-Line/smart-report-v2.git`.
- `make setup` runs `git submodule update --init --recursive` before `pnpm install`.
- No change to `packages/pdf-client`, `modules/opd/.../pdf_platform_client.py`, `op_consult_report.py`, `tools/extract-opd-report-templates.mjs`, or `packages/registration-reports`.

## Links

- Submodule: `external/pdf-platform` (`IQ-Line/smart-report-v2`)
- pdf-platform evidence: `packages/report-engine/src/routes.ts`, `apps/pdf-worker/src/routes/register-report-routes.ts`, `apps/pdf-worker/src/use-cases/render-report-pdf.ts`, `apps/pdf-worker/src/bootstrap/register-reports.ts`, `packages/contracts/src/schemas/reports/*`, `packages/report-opd-slip/src/generated/opd-templates.generated.ts` (`renderOPBillingHtml`)
- HIMS evidence: `packages/pdf-client/src/*`, `modules/registration/src/use-cases/render-partner-opd-slip-pdf.ts`, `modules/registration/src/use-cases/get-registration-documents.ts`, `modules/opd/src/opd/lib/pdf_platform_client.py`, `modules/opd/src/opd/services/clinical_documents_service.py`, `modules/opd/src/opd/integrations/op_consult_report.py`, `tools/extract-opd-report-templates.mjs`, `packages/registration-reports/src/opd-templates.generated.ts`
- Related: [ADR-0034 — Polyglot boundary freeze](./0034-polyglot-boundary-freeze.md) (why the Python client stays Python), [ADR-0016 — Polyglot Nx monorepo, spec-first contracts](./0016-polyglot-nx-monorepo-spec-first-contracts.md) (language-agnostic contracts)
