# ADR-0018: Frontend technology stack — Zustand, TanStack Router, TanStack Query

- **Status:** Proposed
- **Date:** 2026-05-04
- **Deciders:** [Architect], [Tech Lead], [Engineering Manager]

## Context and problem statement

The platform's frontend is a single SPA serving all user roles (clinicians, admin staff, super-admins). Before the first feature module is built, the team needs decisions on: (1) client-side state management, (2) routing, (3) server-state caching, (4) data tables and virtualization, and (5) how frontend authorization integrates with the Cerbos permission model defined in [HLD-04 §12](../hld/04-authn-authz-flow.md). These choices determine the frontend folder structure, the developer workflow, and the re-render characteristics of a SPA that will grow to 15-30 feature modules.

## Decision drivers

- **Re-render efficiency.** A healthcare SPA has dense, data-heavy pages (patient dashboards, lab result grids, multi-step registration forms). State changes in one area (auth token refresh, tenant context switch) must not cascade re-renders into unrelated components.
- **Layered state architecture.** Global state (auth, tenant, permissions, UI preferences) must be accessible everywhere without prop drilling. Feature-level state (OPD queue filters, billing draft) must be co-located with its feature and lazy-loaded with it.
- **Type safety at the URL boundary.** Hospital workflows are URL-driven — patient lists have filters (department, status, date range, search query, page) encoded in the URL. These search params must be typed and validated, not raw strings.
- **Team learning curve.** 7 developers with Express/MongoDB background. Fewer new concepts is better. The state management API must map to mental models the team already has.
- **Frontend authorization.** The platform uses Cerbos for authorization ([ADR-0004](./0004-authz-cerbos-sidecar.md)). HLD-04 §12 specifies a permission map fetched via `PlanResources` on login. The frontend must render UI conditionally based on this map without scattering permission checks across components.

---

## Decision 1: Client state management — Zustand

### Considered options

1. **React Context** — built-in, no library needed.
2. **Zustand** — minimal store with selector-based subscriptions.
3. **Jotai** — atomic reactive state.
4. **Redux Toolkit** — centralized store with reducers and middleware.

### Decision outcome: Zustand

**Why not React Context:** Context re-renders every consumer when any value in the context object changes — there is no selector mechanism. A `TenantContext` with `{ tenantId, tenantName, branches, activeBranch }` re-renders every consumer when `activeBranch` changes, even if the consumer only reads `tenantId`. For a SPA with 15-30 feature modules where auth and tenant context change on login, tenant switch, and branch switch, this causes unnecessary cascading re-renders. React Context is appropriate for dependency injection (providing a QueryClient or Cerbos client instance), not for frequently-read application state.

**Why not Jotai:** Jotai's atomic model is powerful but introduces a paradigm shift. Atoms form a reactive dependency graph — a mental model unfamiliar to developers coming from Express/MongoDB. Jotai's `jotai-tanstack-query` integration also blurs the client/server state boundary, creating "should this be `atomWithQuery` or `useQuery`?" debates. Zustand's mental model ("an object with state and functions") maps directly to what the team knows.

**Why not Redux Toolkit:** Redux was the default choice for React state management for years, but it is no longer the right fit. Three reasons: (1) **Boilerplate.** Even with Redux Toolkit's improvements over vanilla Redux, the ceremony remains significant — slices, reducers, actions, action creators, selectors, the store configuration, middleware setup. For HIMS's thin client state surface (four global stores, each with 3-5 fields), this is overkill. (2) **Age and momentum.** Redux's mental model (unidirectional data flow, immutable state, pure reducer functions) was designed for a pre-hooks React era. Modern alternatives like Zustand achieve the same guarantees with a fraction of the API surface, using hooks natively. The React ecosystem has moved on — new projects increasingly choose lighter alternatives. (3) **Bundle size.** `@reduxjs/toolkit` is ~11 kB gzipped (plus `react-redux` at ~5 kB) vs Zustand's ~1.1 kB. Not a dealbreaker, but indicative of the weight mismatch for our use case.

**Why Zustand:**

- **Selectors prevent re-renders.** `useTenantStore(s => s.tenantId)` only re-renders when `tenantId` changes. Opt-in, dead simple.
- **No Provider required.** Stores are module-level singletons, imported directly. No provider nesting, no context indirection.
- **Outside-React access.** `useAuthStore.getState().accessToken` works in API interceptors, WebSocket handlers, background token refresh — no React tree needed. Critical for a healthcare app where auth tokens are consumed in many non-component contexts.
- **Layered stores map naturally.** Global stores are singletons in `stores/`. Feature stores are co-located with features and lazy-loaded with them. No architectural gymnastics.
- **~1.1 kB gzipped.** Negligible bundle impact.
- **Redux DevTools support.** The `devtools` middleware provides time-travel debugging with named actions — mature tooling the team can use from day one.

### Store architecture

```
Global stores (singletons, imported anywhere):
  stores/auth.store.ts            → useAuthStore
  stores/tenant.store.ts          → useTenantStore
  stores/permissions.store.ts     → usePermissionsStore
  stores/ui-prefs.store.ts        → useUIPrefsStore (with persist middleware)

Feature stores (co-located, lazy-loaded with route):
  features/opd/store.ts           → useOPDStore
  features/billing/store.ts       → useBillingStore
```

### Team conventions

1. **Always use selectors** — `useStore(s => s.field)`, never `useStore()` without a selector (subscribes to entire store, defeats the purpose).
2. **Use `useShallow`** for multi-value selects — `useStore(useShallow(s => ({ a: s.a, b: s.b })))`.
3. **One store per feature module** — keeps lazy-loading clean and prevents god-stores.
4. **Actions inside the store** — business logic in store actions, not scattered in components.
5. **`devtools` middleware on every store** in development — non-negotiable for debugging.
6. **`persist` middleware only on `ui-prefs`** — avoid persisting auth or transient state.

---

## Decision 2: Routing — TanStack Router v1

### Considered options

1. **React Router v7** — the incumbent React router.
2. **TanStack Router v1** — type-safe router with first-class search params.

### Decision outcome: TanStack Router v1

**Why not React Router v7:** React Router's `useSearchParams()` returns raw `URLSearchParams` — everything is a string, nothing is validated, nothing is typed. In a healthcare SPA where every list view encodes filters in the URL (department, status, date range, search query, page), this means manual parsing, manual type coercion, manual validation in every component that reads search params. Bugs from stale or malformed search params are silent — the component renders with wrong data rather than throwing a type error.

**Why TanStack Router:**

- **Type-safe search params via `validateSearch`.** Define a Zod schema on the route, get a fully typed `useSearch()` hook. `<Link search={{ page: 2, filter: "active" }}>` is type-checked. Default values are defined in the schema. Complex objects (arrays, nested filters) are auto-serialized. This prevents an entire class of bugs in filter-heavy healthcare UIs.
- **Compile-time route validation.** `<Link to="/patients/$patientId" params={{ patientId: id }}>` is a compile error if the route doesn't exist or the params are wrong. React Router links are string-based — no compile-time validation.
- **First-class TanStack Query integration.** Route loaders call `queryClient.ensureQueryData(queryOptions)` to prefetch; components call `useSuspenseQuery(queryOptions)` to read from cache. The canonical pattern from TanStack's documentation, not a bolted-on integration.
- **File-based routing via Vite plugin.** The route tree is auto-generated from the filesystem. Code-splitting happens automatically. Reduces boilerplate and enforces consistent route structure.
- **`beforeLoad` for auth guards.** Route-level auth and permission checks happen before any component renders, with typed context propagation.

**Risk:** Smaller community than React Router (500-700K vs 12M weekly downloads). Mitigation: stable v1, active maintainer, file-based routing reduces the surface area where community examples matter. The team has no existing React Router codebase to migrate — both are greenfield.

---

## Decision 3: Server state — TanStack Query v5 (React Query)

Already planned ([ADR-0016](./0016-polyglot-nx-monorepo-spec-first-contracts.md)). This ADR adds specific patterns to adopt:

- **`useSuspenseQuery`** — default for all data-fetching components. Eliminates `isPending` checks entirely with React 19's improved Suspense.
- **`usePrefetchQuery`** — fire prefetches during render (e.g., prefetch patient details on list item hover).
- **`queryOptions()` helper** — co-locate query key + query function in a single object. Excellent for generated OpenAPI queries.
- **Query key factory pattern per module** — surgical cache invalidation.

```typescript
export const patientKeys = {
  all: ['patients'] as const,
  lists: () => [...patientKeys.all, 'list'] as const,
  list: (filters: PatientFilters) => [...patientKeys.lists(), filters] as const,
  detail: (id: string) => [...patientKeys.all, 'detail', id] as const,
};
```

---

## Decision 4: Data tables and virtualization — TanStack Table v8 + TanStack Virtual v3

**TanStack Table v8** (8.21.3, stable): headless UI for sorting, filtering, pagination, column visibility, row selection, row expansion, column resizing, column pinning. Industry standard — no credible alternative at this quality level for headless React tables. Needed for patient lists, lab results, appointment schedules, audit logs, master data management.

**TanStack Virtual v3** (3.13.24, stable): virtualization for large lists. Renders only visible items plus configurable overscan. Essential for:
- ICD-10 code lookups (~70,000 codes)
- SNOMED CT concept search (~350,000 concepts)
- Drug database autocomplete (tens of thousands of entries)
- Patient lists on busy hospital floors (hundreds of active patients)
- Audit logs (thousands of entries)

Pairs with TanStack Table for virtualized table rows and with TanStack Query's `useInfiniteQuery` for infinite scroll.

---

## Decision 5: Frontend authorization — Cerbos permission store

This decision implements the frontend authorization architecture defined in [HLD-04 §12.1-12.3](../hld/04-authn-authz-flow.md) and [ADR-0004](./0004-authz-cerbos-sidecar.md).

**Three layers:**

1. **`usePermissionsStore` (Zustand)** — holds the structured permission map fetched on login/context-switch via Cerbos `PlanResources` endpoint. Used for navigation visibility, feature gating, and action permissions. Refreshed on tenant/branch switch.

2. **`@cerbos/react` hooks** — per-component authorization checks for dynamic, resource-specific decisions not in the cached map (e.g., "can this user approve THIS specific lab result?"). Uses `useIsAllowed()` or `useCheckResource()`.

3. **`@cerbos/http`** — browser-compatible HTTP client that `@cerbos/react` uses to communicate with the Cerbos PDP (via the BFF proxy).

**Permission map structure** (from HLD-04 §12.1):

```json
{
  "opd": { "registration": { "read": true, "write": true }, "prescription": { "read": true, "write": false } },
  "pharmacy": { "dispensing": { "read": false, "write": false } }
}
```

**Frontend uses:**
- **Navigation:** Module tabs shown/hidden based on top-level module access.
- **Feature visibility:** Sections, buttons, form fields shown/disabled based on feature-level permissions.
- **Action gating:** Write/delete buttons disabled for read-only users. The UI never shows a button the backend will reject.

**Principle from HLD-04 §12:** Frontend authorization is a UX optimization, not a security boundary. The backend always re-checks via Cerbos PDP. Frontend permission data can be stale; the backend PDP is authoritative.

---

## Decisions explicitly skipped

| Library | Version | Why skipped |
|---------|---------|-------------|
| TanStack Form | 1.29.1 | React Hook Form's uncontrolled approach (ref-based, near-zero re-renders during typing) is more performant for 50+ field healthcare forms. RHF is 60x more adopted with universal component library integration. |
| TanStack Start | 1.120.20 (RC) | Release Candidate — not stable enough for healthcare. Redundant with our Fastify backend. SPA mode is just TanStack Router + Vite, which we get directly. |
| TanStack Store | 0.11.0 | Internal primitive for TanStack libraries, not an application-level state manager. Zustand is the right tool. |

---

## Consequences

**Positive:**

- **Zero unnecessary re-renders from global state.** Zustand selectors ensure components subscribe to exactly the state they need. An auth token refresh does not re-render a patient table.
- **Type-safe URLs.** Search params are validated by Zod schemas, typed in components, and type-checked in `<Link>` elements. Filter bugs are compile errors, not runtime surprises.
- **Permission system is centralized.** One Zustand store + one Cerbos provider. Components check `usePermissionsStore` for cached permissions or `@cerbos/react` hooks for dynamic checks. No scattered `if (user.role === 'admin')` conditionals.
- **Consistent TanStack ecosystem.** Router, Query, Table, Virtual — all from the same team, all headless, all TypeScript-first. Integration patterns are documented and tested together.
- **Feature stores lazy-load with routes.** A feature's Zustand store is code-split with its TanStack Router route. No upfront cost for unvisited features.

**Negative / accepted trade-offs:**

- **TanStack Router learning curve.** New concepts: `validateSearch`, route context, `beforeLoad`, file-based routing conventions. Mitigation: budget 1 sprint for team internalization; file-based routing via Vite plugin reduces boilerplate; patterns are documented in the frontend LLD.
- **Smaller TanStack Router community.** Fewer Stack Overflow answers, fewer blog posts. Mitigation: official docs are thorough, Discord is responsive, and the file-based routing plugin reduces the surface area where examples matter.
- **Zustand requires selector discipline.** Using `useStore()` without a selector subscribes to the entire store and defeats the purpose. Mitigation: document as a team convention, catch in code review, consider an ESLint rule.

---

## Follow-up actions

- [ ] Create the frontend LLD (`docs/architecture/lld/frontend/01-frontend-structure.md`) documenting the folder structure, store architecture, TanStack Router patterns, query key conventions, and permission integration.
- [ ] Evaluate `@cerbos/embedded` (WebAssembly PDP) for offline mode — policies evaluated locally without network calls, relevant for rural health centers.
- [ ] Decide on Pulse consumption mechanism (pnpm workspace link, local path, or npm pack from IQSandbox) during first sprint.

## Links

- Related ADRs: [ADR-0004](./0004-authz-cerbos-sidecar.md) (Cerbos), [ADR-0016](./0016-polyglot-nx-monorepo-spec-first-contracts.md) (Nx monorepo)
- Related HLD: [AuthN/AuthZ Flow §12](../hld/04-authn-authz-flow.md) (frontend authorization)
- Related LLD: [Frontend Structure](../lld/frontend/01-frontend-structure.md), [Repo Structure](../lld/repo-structure/01-monorepo-setup.md)
