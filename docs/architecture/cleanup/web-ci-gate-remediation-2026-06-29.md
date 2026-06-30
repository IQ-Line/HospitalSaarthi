# services/web CI-gate remediation plan (#50)

**Date:** 2026-06-29 (updated 2026-06-30) · **Branch:** `dev--improved-v1` · **Status:** typecheck grind **down to 9 committed-state errors** (from 282). User decisions captured (org_id=send configuratorOrgId; RoleEditorDialog=Option A; technical fixes + lint = proceed autonomously). The big entangled UM cluster (create-user-form + edit-user-dialog + doctor-tariff shared section, 13 errors incl. the org_id latent-bug fix) is **DONE** (`b4f85645`). **Remaining 9:** role-management-sections capability-tree (7, data-model, no test net — most delicate), visitpad-global-import-payloads medicine-row→create-form `as` cast (1), tenant-detail-panels RoleEditorDialog Option A (1, add delete button+props). Then the lint half (171 errors) then wire the targets.

## Progress log (committed-state typecheck count; CI-visible, excludes the 2 untracked not-ours web files = 5 errs)

| commit | cluster | count |
|---|---|---|
| (prior) 2c878e8e | foundation: ignoreDeprecations, deps, @pulse/layouts path, route-tree regen | 282 → 225 |
| (prior) aabc28c7 | RHF recipe proven on medicines.tsx | 225 → 203 |
| e6a63468 | RHF 3-generic propagation across 13 catalog forms (visitpad + master-data) | 203 → 158 |
| 51562a24 | API-type drift (short_name/snomed_code/requiredModules) + auth queryFn | 158 → 136 |
| 4fa5b519 | noUncheckedIndexedAccess guards + null-safety (10 files) | 136 → 102 |
| 5ad4e147 | zustand devtools/persist slice mutators (tenant always-persist + noop storage) | 102 → 91 |
| 838ec513 | enum-membership Set<string> + module-resolution specifiers | 91 → 85 |
| 2e50f249 | test fixtures conformed to real production types (7 files) | 85 → 56 |
| bb7a5865 | OPD clinical payload concrete element types (opd-prescription-types.ts; mapper untouched) | 56 → 41 |
| 3dbb5346 | visitpad catalog option helpers (param widen + dead default) | 41 → 37 |
| 3f788312 | router search keys at navigate/redirect sites (5 files) | 37 → 30 |
| cf75b851 | misc component/lib (validation generics, fragment return, pincode string-widen, drop dead `modal`, fee-line tax_percent) | 30 → 24 |
| 19c9cd08 | boundary residuals (ModuleCatalogEntry.category→ModuleCategory; auth scope type-guard predicate) | 24 → 22 |
| b4f85645 | UM RHF cluster: create-user-form + edit-user-dialog + shared doctor-tariff section (3-generic, input-typed props, ArrayPath, org_id latent-bug fix) | 22 → 9 |

**Remaining 9 (committed-state) — proceed autonomously per user (decisions captured), each careful / no test net:**
- `role-management-sections.tsx` (7) — capability-tree data-model: `MutableCapabilityTreeBranch` (Map children) vs render `CapabilityTreeNode` (array + `kind` discriminant). Reconcile at the boundary; **preserve exact branch/leaf grouping** (no test net → verify by reading the rendered tree logic). MOST delicate; do with fresh focus.
- `visitpad-global-import-payloads.ts` (1) — L192 `{ code, ...visitpadMedicineEditFormFromRow(row) } as VisitpadMedicineCreateFormSchema` no longer overlaps (edit-form-from-row yields optional fields vs the create schema's required). Fix in `medicine-create-defaults` shapes (use the input alias or align `visitpadMedicineCreatePayloadFromForm`'s param), NOT an `as unknown`.
- `tenant-detail-panels.tsx` (1) — RoleEditorDialog **Option A** (user-approved): add optional `onDelete?`/`deletePending?` to `RoleEditorDialogProps` and render a destructive Delete action in the footer (edit mode only); backward-compatible with the role-management-panel caller. This RESTORES the role-delete feature (a real UI add).

**Method note (2026-06-30):** the autonomous-safe clusters were diagnosed + adversarially verified by a `Workflow` fan-out (read-only `Explore` agents, diagnose→refute pipeline). The adversarial pass earned its keep: it **rejected** an OPD mapper edit that smuggled a clinical-`certainty` runtime change under a fabricated compile-error justification (applied only the 5 honest type narrowings). My own tsc gate then **reverted** the proposed pincode `setValue` retype (broke caller assignability). Lesson: subagent type-fixes must pass both adversarial review AND a real tsc/vitest gate before landing.

**Remaining 22 (committed-state) — ALL user-checkpoint / HIGH-risk:**
- `create-user-form.tsx` (8) — RHF input≠output **plus** the `org_id` payload change (currently always `undefined`; fix would carry `configuratorOrgId` for super-admins → may be a latent functional bug the type surfaces — **decide intentionally**). Split the RHF part from the payload-semantics part.
- `role-management-sections.tsx` (7) — `MutableCapabilityTreeBranch` (Map children) vs render-time `CapabilityTreeNode` (array children + discriminant). Reconcile at the boundary; **must preserve exact branch/leaf grouping** (verify rendered tree unchanged).
- doctor-tariff cluster (5): `edit-user-dialog.tsx` (4) + `create-user-doctor-departments.tsx` (1). The schema's `doctor_tariffs: z.array(...).default([])` makes the INPUT type's `doctor_tariffs` optional, which fails the shared `DoctorTariffFieldValues` constraint (required). Entangled with create-user-form. Decide the schema shape.
- `visitpad-global-import-payloads.ts` (1) — adds `safeParse` numeric coercion + throw-on-invalid (real runtime change).
- `tenant-detail-panels.tsx` (1) — **product decision**: RoleEditorDialog never declared `onDelete?/deletePending?` though the tenant connector fully wires role-delete. Option A (recommended): add the optional props + render a destructive Delete (edit mode) → restores the feature, adds a button (runtime change). Option B: strip the delete wiring from the connector → regresses the feature + cascades unused-locals. **Pick A or B.**

After these 22 → 0: do the **lint half (160 errors)** then **wire the `typecheck`+`lint` nx targets**.

## Why

`services/web` is the only project with **no `lint` and no `typecheck` nx target**, so CI Stage 1 (`nx affected -t lint`) and Stage 2 (`nx affected -t typecheck`) skip the entire frontend. Every frontend PR can introduce type/lint regressions undetected. #50 closes that hole. The `test` target already exists and runs in CI Stage 4 (green — see below).

A CI-red gate is worse than no gate (it gets ignored), so each target is added **only once its errors reach 0**. That makes #50 a staged remediation, not a one-shot.

## Ground truth (measured 2026-06-29, TS 6.0.3)

The "~246 errors" in prior notes was measured under a broken config and is superseded. Real numbers:

| Half | Measured | Notes |
|---|---|---|
| **Config blocker** | typecheck could not run at all | `baseUrl` tripped TS5101 (deprecated in TS 6.0). **Fixed** with `"ignoreDeprecations": "6.0"` — the exact convention every backend tsconfig already uses. |
| **Typecheck** | **282 → 233 → 225** | 282 with the stale route tree; 233 after route-tree regen (49 stale-tree artifacts); **225** after this turn's config/dep fixes. This 225 is the true committed-source debt CI will see (given route-tree codegen runs first — see below). |
| **Lint** | **160 errors** + 251 warnings | Only errors gate (`eslint src/` has no `--max-warnings`). `detect-object-injection` (88) and `no-non-null-assertion` (31) are **warnings**, not errors. |
| **Test** | **459 passing / 89 files, green** | Prior "~6 files failing" note was stale (fixed by colocation + create-rx rewrites). `test` target is live in CI Stage 4. ✅ done. |

## CRITICAL: `src/routeTree.gen.ts` is gitignored

The TanStack Router tree is **gitignored** and was locally stale (generated 2026-05-27), missing the entire `nurse / pharmacy / patients / create-rx / historical-records / walk-in-orders` route subtrees → **~52 errors across 16 files** (rejected `createFileRoute` ids, `Link to=` union failures, `useParams` param drift). Vite regenerates it on `dev`/`build`, so the running app is fine; only `tsc` (which doesn't run Vite) saw the stale file.

**Consequence for the gate:** in a fresh CI checkout the file does not exist, so the **`typecheck` target must run route-tree codegen before `tsc`**. A standalone (non-Vite) generator works:

```js
// mirrors @tanstack/router-plugin's invocation
import { Generator, getConfig } from '@tanstack/router-generator';
const root = process.cwd();
const generator = new Generator({ config: getConfig({ target: 'react' }, root), root });
await generator.run();
```

Wire this as a `routes:gen` target and make `typecheck` (and ideally `lint`) `dependsOn` it, or chain it in the command. Do NOT commit the generated file (it stays gitignored).

## Systemic clusters (one upstream fix clears many)

From the read-only Map workflow (`wf_a6ac0160`, 11 agents). Risk = behavior-change risk of the fix.

1. **Stale route tree** — ~52 errs / 16 files / risk none → regenerate (above). *Already done locally; permanent fix = the codegen target.*
2. **RHF generics** — ~28–50 errs / ~10–15 files / risk low. Forms use `useForm<z.infer>` (= z.output) or `useForm<z.input>` while `zodResolver` (v5) returns `Resolver<z.input, ctx, z.output>`; schemas use `.default()/.optional()/.transform()` so input ≠ output and the resolver/Control/SubmitHandler chain mismatches. **Fix:** type `useForm<z.input<typeof schema>>`, submit handlers `SubmitHandler<z.output<...>>`, and shared `FormFields` props `UseFormReturn<z.input, unknown, z.output>`. ✅ **PROVEN on `medicines.tsx` (22→0, total 225→203, type-only, tests green, commit below).** The minimal fix per form is BOTH parts: **(a)** the explicit 3-generic `useForm<Input, unknown, Output>` — single-generic does NOT suffice (it defaults `TTransformedValues` to the first arg, mismatching the resolver's `Output`; the systemic analyst's "single generic is enough" claim was **refuted** empirically — medicines already used `useForm<Input>` and still had 22 errors); **(b)** widen every `Control<T>` component the form feeds (local *or* shared) to `<T extends FieldValues, TT extends FieldValues = T>` + `control: Control<T, unknown, TT>` (the `= T` default keeps all existing callers compiling — verified: no regression in other `form-toggle-row` callers). `form-toggle-row.tsx` already widened. No `any`/`as`/`@ts-ignore`/`!`. Masking tradeoff: `watch/getValues/field.value` read as the looser input shape (code already guards with `!!` / `?? ''`). **Propagation note:** pages vary in their *current* generic (some `useForm<...FormInput>`, some `useForm<...FormSchema>`) and the master-data pages route `control` through a shared `FormFields` typed `ReturnType<typeof useForm<...>>` → change those to `UseFormReturn<Input, unknown, Output>`; UM `create-user-form` is HIGH-risk (org_id, see risk tiers) so split its RHF part from the payload change. Look up each page's Input/Output alias in `features/visitpad/validation.ts` (don't guess).
3. **OPD prescription mapper** — ~12 errs / 2 files / risk low. `opd-prescription-types.ts` nested arrays typed `unknown[]`; give concrete element shapes (verify against `opd.v1.yaml` + the backend mapper, both modified on this branch — don't guess).
4. **`noUncheckedIndexedAccess` unguarded index** — ~22 errs / 5 files / risk low, concentrated in `module-manifest-loader.ts` + `abha-number-segment-input.tsx`. Add one local guard per hotspot; do NOT disable the flag.
5. **Auth principal queryFn** — ~4 errs / 3 files / risk none. `queryFn: fetchAuthPrincipal` breaks TanStack Query TData inference → wrap `queryFn: () => fetchAuthPrincipal()`.
6. **Shared API type drift** — risk none. `ModuleManifest.requiredModules` (singular) missing; `VisitpadChiefComplaint`/`VisitpadDiagnosis` missing `short_name?: string | null` (sibling `VisitpadMedicine` already has it). Additive optional fields matching real usage/API.
7. **Module resolution** — risk low. ✅ done this turn: `react-day-picker` dep, `@pulse/layouts/*` tsconfig path, `@types/node` + `"types": ["node"]`. Remaining: 2× `.ts` import-extension (`catalog-tenant.ts`, `development-seed-users.ts`) drop the suffix.
8. **Capability tree builder vs node type** — ~9 errs / 2 files / risk **high**. `MutableCapabilityTreeBranch` (Map children) leaks into the render-time `CapabilityTreeNode` (array children + discriminant). Reconcile at the boundary; **must preserve exact branch/leaf grouping** — verify rendered tree unchanged.

## Risk tiers (the 277 mapped type errors)

- **none (195 errs):** pure type-only fixes, zero runtime change. Safe to batch.
- **low (71 errs):** logic-preserving guards/refactors in mostly untested code; many explicitly inert (in-bounds index, dead branch). Safe but edits runtime code → verify with the (green) test suite + manual read.
- **high (11 errs, 2 files):** real behavior change — handle deliberately, likely a user checkpoint:
  - `create-user-form.tsx` (8): the `org_id` fix changes the `POST /users` payload (currently always `undefined`; would carry `configuratorOrgId` for super-admins). This may be a latent functional bug the type surfaces — decide intentionally.
  - `visitpad-global-import-payloads.ts` (3): adds `safeParse` numeric coercion + throw-on-invalid (real runtime change).
  - (also treat the **capability-tree** cluster as high — touches a data model.)

## Execution order (safest / highest-leverage first)

1. ✅ **Foundation** (this turn): `ignoreDeprecations`, `types:["node"]`, `@pulse/layouts/*` path, `react-day-picker` + `@types/node` deps. 282→225.
2. **Codegen target** + wire `typecheck` `dependsOn` it (clears the ~52 route-tree errors in CI without committing the artifact).
3. **RHF generics** (own focused commit; prove on `medicines.tsx` first; tsc + full vitest must stay green).
4. **Type-only tail** (risk none): shared API types, auth queryFn, mapper element types, enum-narrowing, test-fixtures, `.ts` extensions.
5. **Low-risk tier** (guards/refactors): batch with the green test suite as the net + manual review; adversarial verify behavior-preservation.
6. **High-risk tier** (capability tree, create-user org_id, import coercion): deliberate, likely user input.
7. **Lint half** (160 errors): mostly mechanical (`no-unused-vars` 22 + `no-dead-store` 21 + `unused-import` 17 = ~60 dead-code; `void-use` 31), regex rules via justified per-line disables (backend D22 precedent), 2 real `@nx/enforce-module-boundaries` violations to investigate.
8. **Wire `typecheck` + `lint` targets** into `project.json` (mirroring `modules/user-management`) → CI Stages 1+2 now gate the frontend. Verify green.

## Process guardrails (doctrine)

- **No silencers:** `any` / `as any` / `as unknown` / `@ts-ignore` / `@ts-expect-error` / non-null `!` are banned to make a fix pass. Make the type genuinely correct, or fix the declaration to match reality.
- web has many **untested components** — for any non-type-only fix, the (green) 459-test suite is the net; adversarially verify behavior-preservation before accepting.
- Re-lint changed files with **explicit paths** before commit (zsh word-split footgun; a backend reviewer once missed pre-existing errors).

## Appendix — per-file findings (Map workflow `wf_a6ac0160`)

| risk | errs | file | category | root cause (short) |
|---|---:|---|---|---|
| none | 22 | `src/routes/_authenticated/visitpad/medicines.tsx` | rhf-generics | visitpadMedicineCreateFormSchema/EditFormSchema use .default(), z.coerce.number() and stri |
| none | 14 | `test/unit/navigation/navigation-manifest.test.ts` | test-fixture | The local helper `visitpadMasterGroup` (L64-67) annotates its param as `readonly { id: str |
| none | 11 | `services/web/src/features/create-rx/lib/opd-prescription-mapper.ts` | api-type-drift | In clinicalToCreateRxFormData the reader maps over c.physical_activities (L152-157), c.med |
| none | 8 | `src/routes/_authenticated/visitpad/chief-complaints.tsx` | rhf-generics | Two distinct causes. (1) L120 and L701 read r.short_name/row.short_name but the VisitpadCh |
| none | 7 | `test/unit/features/configurator/components/create-tenant-wizard/wizard-module-tree.test.ts` | test-fixture | Two test-fixture defects against the real production types. (1) noUncheckedIndexedAccess ( |
| none | 5 | `services/web/src/routes/_authenticated/visitpad/units.tsx` | rhf-generics | Both dialogs call `useForm<VisitpadUnitCreateSchema>` / `useForm<VisitpadUnitEditFormSchem |
| none | 5 | `src/routes/_authenticated/master-data/modules.tsx` | rhf-generics | moduleFormSchema has .default() on `version` and `is_active`, so z.input != z.output (Modu |
| none | 5 | `src/routes/_authenticated/master-data/permissions.tsx` | rhf-generics | Same RHF/zodResolver input≠output issue. permissionFormSchema has description: nullableTex |
| none | 5 | `src/routes/_authenticated/visitpad/allergens.tsx` | rhf-generics | All 5 are the zodResolver input/output mismatch in AllergenCreateDialog. visitpadAllergenC |
| none | 5 | `src/routes/_authenticated/create-rx/$visitId.tsx` | other | src/routeTree.gen.ts is stale (generated 2025-05-27). This route file's id '/_authenticate |
| none | 5 | `src/routes/_authenticated/master-data/module-permissions.tsx` | rhf-generics | zodResolver v5 returns `Resolver<z.input, ctx, z.output>`. `modulePermissionFormSchema`/`m |
| none | 4 | `test/unit/features/create-rx/lib/opd-prescription-mapper.test.ts` | api-type-drift | `OpdPrescriptionClinicalPayload` declares `medical_history_allergies`, `diagnoses`, and `v |
| none | 4 | `services/web/test/unit/lib/legacy-authorization-ban.test.ts` | module-resolution | The web tsconfig (extends packages/tsconfig/react-app.json -> tsconfig.base.json) compiles |
| none | 4 | `src/routes/_authenticated/visitpad/diagnoses.tsx` | api-type-drift | Two independent causes. (a) interface VisitpadDiagnosis (src/features/visitpad/types.ts) i |
| none | 4 | `src/routes/_authenticated/visitpad/procedures.tsx` | rhf-generics | Two causes. (1) enum-narrowing: PROC_CATEGORY_VALUES/PROC_BILLING_VALUES are `new Set(VISI |
| none | 4 | `src/routes/_authenticated/visitpad/reactions.tsx` | rhf-generics | Two causes. (1) L337/380: zodResolver input/output mismatch in ReactionCreateDialog — visi |
| none | 4 | `src/features/pharmacy/components/pharmacy-queue-table.tsx` | other | `<Link to="/pharmacy/walk-in-orders/$recordId">` and `to="/pharmacy/visits/$visitId"` (plu |
| none | 4 | `src/features/pharmacy/components/pharmacy-walk-in-dispense-page.tsx` | other | Stale src/routeTree.gen.ts. The component navigates/links to '/pharmacy/walk-in-orders/$re |
| none | 3 | `src/navigation/manifest-product-access.ts` | api-type-drift | L18 reads `manifest.requiredModules?.length` / `manifest.requiredModules.every(...)` but ` |
| none | 3 | `services/web/src/routes/_authenticated/visitpad/chronic-illness.tsx` | rhf-generics | Two causes. L82: CHRONIC_CATEGORY_VALUES = new Set(VISITPAD_CHRONIC_ILLNESS_CATEGORIES.map |
| none | 3 | `services/web/src/routes/_authenticated/historical-records/$patientId.tsx` | module-resolution | The route source is correct, but the generated src/routeTree.gen.ts (gitignored — confirme |
| none | 3 | `src/features/opd-patients/components/opd-patients-table.tsx` | api-type-drift | src/routeTree.gen.ts is stale and predates the create-rx route. src/routes/_authenticated/ |
| none | 3 | `src/features/visitpad/api/query-keys.ts` | null-safety | noUncheckedIndexedAccess. L48: VISITPAD_LIST_KEY_BY_PATH is typed Record<string,...>, so i |
| none | 3 | `src/features/create-rx/components/page.tsx` | module-resolution | Two independent causes. L5: `@pulse/layouts/two-column-layout` (TS2307) — services/web/tsc |
| none | 3 | `src/features/create-rx/components/prior-medical-history-preview.tsx` | other | Stale src/routeTree.gen.ts. The Link (L170-172) targets '/create-rx/$visitId' with params  |
| none | 3 | `src/features/nurse/components/nurse-visit-page.tsx` | module-resolution | Two independent causes. L6 TS2307: `@pulse/layouts/two-column-layout` cannot be resolved — |
| none | 2 | `src/routes/_authenticated/pharmacy/visits/$visitId.tsx` | api-type-drift | src/routeTree.gen.ts (TanStack Router generated tree, dated May 27) contains zero pharmacy |
| none | 2 | `src/features/visitpad/lib/chief-complaint-import-payload.ts` | api-type-drift | L10 reads `row.short_name` (twice) but the `VisitpadChiefComplaint` interface (src/feature |
| none | 2 | `src/routes/_authenticated/visitpad/vaccines.tsx` | rhf-generics | `visitpadVaccineCreateFormSchema` has `is_active: z.boolean().optional().default(true)`, s |
| none | 2 | `services/web/src/routes/_authenticated/pharmacy/walk-in-orders/$recordId.tsx` | module-resolution | The generated src/routeTree.gen.ts is gitignored and produced by @tanstack/router-plugin ( |
| none | 2 | `services/web/src/stores/permissions.store.ts` | arg-count | `permissionsSlice` is typed `StateCreator<PermissionsState>` with no middleware mutators,  |
| none | 2 | `src/features/nurse/components/nurse-patients-table.tsx` | api-type-drift | Same stale src/routeTree.gen.ts. src/routes/_authenticated/nurse/patients/$visitId.tsx exi |
| none | 2 | `src/features/pharmacy/components/pharmacy-dispense-page.tsx` | other | Both <Link to="/pharmacy/queue"> (L152, L167) fail because '/pharmacy/queue' is absent fro |
| none | 2 | `src/routes/_authenticated/visitpad/manufacturers.tsx` | rhf-generics | Same RHF/zodResolver input≠output issue. visitpadManufacturerCreateFormSchema has is_activ |
| none | 2 | `src/routes/_authenticated/visitpad/rx-columns.tsx` | rhf-generics | Both errors are the zodResolver input/output mismatch in RxColumnCreateDialog. visitpadRxC |
| none | 2 | `src/features/historical-records/api/historical-records.ts` | null-safety | resolveAbhaField(empiValue: string, snapshotValue: string / undefined) is called at L299/L |
| none | 2 | `src/features/historical-records/components/historical-records-table.tsx` | other | L45 TS2322 + L46 TS2353: `<Link to="/historical-records/$patientId" params={{ patientId }} |
| none | 2 | `src/routes/_authenticated/nurse/patients/$visitId.tsx` | other | L4 TS2345: `createFileRoute('/_authenticated/nurse/patients/$visitId')` id is not in `keyo |
| none | 1 | `src/routes/_authenticated/pharmacy/queue.tsx` | api-type-drift | Same stale routeTree.gen.ts: '/_authenticated/pharmacy/queue' is not in the generated File |
| none | 1 | `src/features/pharmacy/components/pharmacy-queue-page.tsx` | api-type-drift | Same stale routeTree.gen.ts: the Link `to="/pharmacy/dispense/new"` (L91) is rejected beca |
| none | 1 | `src/features/configurator/components/configurator-address-pincode-fields.tsx` | rhf-generics | L43 casts the bare generic type parameter K (= keyof IndianPincodeAddressValues) to FieldP |
| none | 1 | `src/navigation/module-product-access.ts` | enum-narrowing | L23 assigns entry.category to Module.category (ModuleCategory = 'core'/'clinical'/'adminis |
| none | 1 | `src/features/pharmacy/lib/pharmacy-queue-date-range.ts` | module-resolution | L1 imports `type { DateRange } from 'react-day-picker'`, but services/web/package.json doe |
| none | 1 | `src/platform/modules/use-enabled-tenant-modules.ts` | api-type-drift | L93 iterates `manifest.requiredModules ?? []`, but `ModuleManifest` only declares `require |
| none | 1 | `services/web/src/routes/_authenticated/create-rx.tsx` | module-resolution | Same stale-codegen cause as the walk-in route. This route file dates 2026-05-29, after the |
| none | 1 | `services/web/src/features/configurator/components/create-branch-wizard/index.tsx` | api-type-drift | TenantOnboardingInput.admin.email is declared `email: string` (required, non-null) in src/ |
| none | 1 | `services/web/src/features/user-management/components/create-user-doctor-departments.tsx` | rhf-generics | L217 calls useFieldArray({ control, name: 'doctor_tariffs' as Path<T> }). react-hook-form' |
| none | 1 | `services/web/src/routes/_authenticated/historical-records.tsx` | module-resolution | Same stale generated src/routeTree.gen.ts as the $patientId route: `createFileRoute('/_aut |
| none | 1 | `src/routes/_authenticated/historical-records/index.tsx` | api-type-drift | Same stale src/routeTree.gen.ts. The historical-records route files exist on disk (histori |
| none | 1 | `src/features/configurator/components/create-tenant-wizard/wizard-helpers.ts` | null-safety | buildTenantOnboardingPayload sets admin.email to `string / null` (null when no email is en |
| none | 1 | `src/features/user-management/components/user-management-page-shell.tsx` | null-safety | noUncheckedIndexedAccess: `sectionItems` (L22) is inferred as a 2-element array, not a tup |
| none | 1 | `test/unit/features/dashboard/api/facilities.test.ts` | test-fixture | The fetchTenants mock returns a ConfiguratorTenant fixture (L18-48) that omits two require |
| none | 1 | `src/lib/auth-principal-query.ts` | other | queryFn: fetchAuthPrincipal (L38) — fetchAuthPrincipal's signature is (options?: FetchAuth |
| none | 1 | `src/routes/_authenticated/nurse.tsx` | other | createFileRoute('/_authenticated/nurse') (L4) fails TS2345 because '/_authenticated/nurse' |
| none | 1 | `test/unit/features/pharmacy/lib/medicine-suggestions.test.ts` | test-fixture | The medicine() fixture's base object literal (L9) is missing the required `black_box_warni |
| none | 1 | `src/lib/catalog-tenant.ts` | module-resolution | L7 imports from '../../../../packages/dev-bootstrap/src/dev-tenant-ids.ts' — the specifier |
| none | 1 | `test/unit/platform/modules/module-registration.test.ts` | test-fixture | At L97 const capabilityKeys = new Set([UM_USER_READ]); UM_USER_READ is `'users:users:read' |
| none | 1 | `src/features/frontdesk/components/visit-registration-sections.tsx` | other | `billingLineDiscountAmount(line: VisitRegistrationBillingFeeLine)` requires the full fee l |
| none | 1 | `src/routes/_authenticated/patients.tsx` | other | `createFileRoute('/_authenticated/patients')` (TS2345): the id `'/_authenticated/patients' |
| none | 1 | `src/features/historical-records/components/historical-record-detail-page.tsx` | other | Stale src/routeTree.gen.ts. The breadcrumb Link (L56) targets '/historical-records', a rou |
| none | 1 | `src/routes/_authenticated/patients/index.tsx` | other | Stale src/routeTree.gen.ts. createFileRoute('/_authenticated/patients/') (L4) is rejected  |
| none | 1 | `src/lib/development-seed-users.ts` | module-resolution | L1 imports '../../../../packages/dev-bootstrap/src/development-seed-users.ts' with an expl |
| none | 1 | `src/features/pharmacy/components/pharmacy-queue-date-range-picker.tsx` | module-resolution | L3 TS2307: `import type { DateRange } from 'react-day-picker'`. react-day-picker is instal |
| none | 1 | `src/navigation/apply-catalog-navigation-labels.ts` | module-resolution | L4 TS2459: imports `ModuleCatalogIndex` from `@/platform/modules/use-enabled-tenant-module |
| none | 1 | `src/routes/_authenticated/pharmacy/dispense/new.tsx` | other | L4 TS2345: `createFileRoute('/_authenticated/pharmacy/dispense/new')` id is not in `keyof  |
| low | 9 | `services/web/src/platform/modules/module-manifest-loader.ts` | null-safety | Two distinct causes. L17 (TS4104): the module-level const VISITPAD_MASTER_NAV_CHILDREN is  |
| low | 8 | `src/features/abha/components/abha-number-segment-input.tsx` | null-safety | tsconfig.base.json sets noUncheckedIndexedAccess:true, so variable-index reads return T/un |
| low | 7 | `src/features/user-management/components/role-management-sections.tsx` | enum-narrowing | MutableCapabilityTreeBranch (the in-progress tree-builder node) has no `kind` discriminant |
| low | 7 | `src/stores/tenant.store.ts` | other | tenantSlice is typed StateCreator<TenantState> with NO mutator type params. Without the [' |
| low | 5 | `src/features/opd-patients/mock/opd-patient-details.mock.ts` | null-safety | tsconfig.base.json enables noUncheckedIndexedAccess, so `parts[0]`, `parts[1]`, `parts[par |
| low | 4 | `services/web/src/features/create-rx/lib/visitpad-catalog-options.ts` | api-type-drift | Two distinct causes. (a) L20-22: visitpadDisplayNameOptions declares its param as `Array<{ |
| low | 4 | `services/web/test/unit/features/user-management/api/queries.test.ts` | test-fixture | The hoisted mock `vi.fn(() => Promise.resolve([]))` declares a zero-parameter function, so |
| low | 4 | `src/features/user-management/components/edit-user-dialog.tsx` | rhf-generics | Same zodResolver v5 input!=output drift (L348/L382/L417): `doctor_tariffs: z.array(doctorT |
| low | 2 | `services/web/src/lib/authorization-context.ts` | null-safety | L104 (TS2322 unknown→AuthPrincipalResponse): `resolvePrincipal` returns `queryClient.fetch |
| low | 2 | `src/routes/_authenticated/user-management/index.tsx` | other | The route's validateSearch returns {q: string; createUser: boolean}. Two navigate({to:'/us |
| low | 2 | `src/features/user-management/lib/role-capability-md-tree.ts` | null-safety | Both errors come from noUncheckedIndexedAccess (set in tsconfig.base.json): array element  |
| low | 2 | `src/features/create-rx/lib/visitpad-validation.ts` | other | L104 (TS2352): `row as Record<string, unknown>` where row is `ChiefComplaintRow` — an `int |
| low | 2 | `src/main.tsx` | other | useAuthStore/useTenantStore/usePermissionsStore are created as `create<T>()(devtools(...)) |
| low | 2 | `src/routes/_authenticated/configurator/tenant.index.tsx` | other | The target route _authenticated/configurator/tenant.$organizationId.tsx uses a function-st |
| low | 1 | `src/routes/_authenticated/user-management/all-tenants.tsx` | other | L6 calls `redirect({ to: '/user-management', search: { q: '' } })`, but the target route's |
| low | 1 | `services/web/src/routes/_authenticated/user-management/roles.tsx` | api-type-drift | L20 `throw redirect({ to: '/user-management', search: { q: '' } })`. The '/_authenticated/ |
| low | 1 | `services/web/src/features/user-management/components/user-list-table.tsx` | other | The Link `to="/user-management/$userId"` requires search of type `{ tenant: string / undef |
| low | 1 | `services/web/test/unit/features/configurator/tenant-tree.test.ts` | test-fixture | The `tenant()` fixture factory builds a ConfiguratorTenant literal, but the interface (src |
| low | 1 | `src/features/configurator/components/create-tenant-wizard/wizard-step-0-organisation.tsx` | other | The second Controller (name='organisationSelectionId', L106-129) has a render prop that re |
| low | 1 | `src/features/configurator/components/tenant-detail-panels.tsx` | excess-prop | The TenantRoleEditorConnector renders <RoleEditorDialog> (defined in src/features/user-man |
| low | 1 | `src/routes/_authenticated/nurse/patients/index.tsx` | api-type-drift | createFileRoute('/_authenticated/nurse/patients/') is rejected because that string is not  |
| low | 1 | `src/app/providers.tsx` | other | `useQuery({ ...authPrincipalQueryOptions(...), select: authPrincipalToCerbosPrincipal })`  |
| low | 1 | `src/lib/clinical-report-print.ts` | null-safety | L388 `blocks[i + 1].top` (TS2532): with noUncheckedIndexedAccess, `blocks[i + 1]` is `{top |
| low | 1 | `src/features/billing/components/tariff-service-form-fields.tsx` | excess-prop | L88 passes modal={false} to @pulse/ui <Select>, whose props are React.ComponentProps<typeo |
| low | 1 | `src/features/billing/lib/doctor-tariff-meta.ts` | null-safety | L56 TS2322 in userVisibleTariffDescription: `const trimmed = description?.trim()` is `stri |
| high | 8 | `src/features/user-management/components/create-user-form.tsx` | rhf-generics | Two unrelated causes. (1) RHF/zodResolver input≠output: buildCreateUserFormSchema has .def |
| high | 3 | `src/features/visitpad/lib/visitpad-global-import-payloads.ts` | api-type-drift | Two causes. (1) L61 (x2): row.short_name is read off VisitpadDiagnosis, but that interface |
