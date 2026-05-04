# ADR-0019: Fastify v5 as HTTP framework, Node.js 24 LTS as runtime

- **Status:** Proposed
- **Date:** 2026-05-04
- **Deciders:** [Architect], [Tech Lead], [Engineering Manager]

## Context and problem statement

The monorepo setup LLD ([§10, §11](../lld/repo-structure/01-monorepo-setup.md#10-technology-choices-summary)) left two decisions open: the HTTP framework (Hono vs Express) and the runtime (Bun was the original default). Both must be resolved before the first module is scaffolded, because SDK packages (`ts-sdk-identity`, `ts-sdk-authz`, `ts-sdk-tenant`) export framework-specific plugins, and the runtime determines the CI base image, `engines` field, and local tooling.

## Decision drivers

- **Spec-first OpenAPI alignment.** The platform uses spec-first contracts ([ADR-0016](./0016-polyglot-nx-monorepo-spec-first-contracts.md)). The HTTP framework must natively validate requests against JSON Schema to close the loop between the OpenAPI spec and runtime enforcement.
- **TypeScript type safety.** Route handlers must infer request/response types from the validation schema without manual type annotations. Duplicate Zod-to-schema or schema-to-type conversions are a maintenance burden and a drift risk.
- **Module isolation.** Each HIMS module registers as an independent plugin on the HTTP server. Middleware, decorators, and lifecycle hooks scoped to one module must not leak into another.
- **Team preference.** The team expressed a preference for Fastify over Express. Since this is a greenfield project with no Express codebase to migrate, team preference is a valid tiebreaker.
- **Management approval.** Upper management will not approve Bun for production. The runtime must be a Node.js LTS release.

## Considered options

### Option 1: Fastify v5

Fastify provides built-in JSON Schema validation (Ajv v8), compiled response serialization (`fast-json-stringify`), an encapsulated plugin system, and first-class TypeScript type providers. Each module registers as a Fastify plugin with isolated scope.

### Option 2: Express 5

Express is the incumbent Node.js HTTP framework. Widely adopted, massive middleware ecosystem. Middleware is global by default (flat stack). No built-in validation — requires external middleware (`express-validator`, `zod-express-middleware`). TypeScript support is via `@types/express`, not native.

### Option 3: Hono

Hono is a lightweight, edge-compatible HTTP framework with built-in Zod validation via `@hono/zod-validator`. Fast, small bundle, runs on Node.js, Bun, Deno, and Cloudflare Workers. Younger ecosystem than Fastify or Express.

## Decision outcome

**Chosen option: Option 1 (Fastify v5)** with Node.js 24 LTS as the runtime.

### Why not Express (Option 2)

Express's flat middleware stack provides no scope isolation. In a multi-module monolith (embedded mode), all modules share a single middleware chain — a decorator registered by the EMPI module is visible to the Configurator module. Fastify's encapsulated plugin system prevents this by design: each `app.register()` call creates a child context that inherits from the parent but cannot leak upward.

Express also lacks built-in validation and response serialization. Adding `express-validator` or a Zod middleware introduces a separate validation layer that does not share types with the route handler. Fastify's `@fastify/type-provider-typebox` provides a single schema object that drives validation, serialization, and TypeScript type inference simultaneously.

Performance: Fastify benchmarks at ~2-3x the requests/second of Express. The difference comes from compiled Ajv validators (not interpreted per-request), `fast-json-stringify` for responses, radix-tree routing via `find-my-way`, and no prototype chain on `request`/`reply`.

### Why not Hono (Option 3)

Hono's validation is Zod-based. In a spec-first workflow where contracts are OpenAPI YAML → JSON Schema, Zod requires an additional conversion step (JSON Schema → Zod or Zod → JSON Schema). Fastify's native JSON Schema validation eliminates this conversion. TypeBox schemas are valid JSON Schema at runtime AND TypeScript types at compile time — the same object drives the OpenAPI spec, runtime validation, response serialization, and TypeScript type inference.

Hono's edge-runtime portability (Cloudflare Workers, Deno) is not a requirement for HIMS. The platform deploys to Kubernetes or single-process embedded mode — both are standard Node.js environments.

Hono is a strong choice for API-gateway or BFF workloads. If the BFF has different requirements than module services, Hono could be reconsidered for the BFF specifically. This is noted as an open option, not a current decision.

### Why Node.js 24 LTS (not Bun)

Upper management will not approve Bun for production deployment. Node.js 24 LTS (v24.15.0) is the current Long Term Support release and provides everything the platform needs:

- Native `fetch()` — stable, no `node-fetch` dependency
- `AsyncLocalStorage` — stable with improved V8 performance, critical for request-scoped tenant context (`iq_tenant_id` propagation via `ts-sdk-tenant`)
- Mature ESM support — `import`/`export` is stable, import attributes are stable
- Web Crypto API — stable, relevant for JWT verification and ABDM security

Compatibility verified: Fastify v5 (requires Node >= 20), Drizzle ORM, Vitest, pnpm 9.x, Nx 19+.

Pin `engines.node` to `">=24.0.0"` in the monorepo root `package.json`.

### Consequences

**Positive:**

- **Spec-first loop is closed.** OpenAPI YAML → JSON Schema → TypeBox schema (in code) → Fastify validation + serialization + TypeScript types. One schema, four uses, zero drift.
- **Module isolation by default.** Each module is a Fastify plugin. SDK packages (`ts-sdk-identity`, `ts-sdk-authz`, `ts-sdk-tenant`) export Fastify plugins that scope their decorators and hooks to the registering context.
- **Built-in structured logging.** Fastify uses Pino by default — JSON logs, request-id correlation, configurable serializers. No separate `morgan` or `winston` setup.
- **Lifecycle hooks for cross-cutting concerns.** `onRequest` → `preParsing` → `preValidation` → `preHandler` → `preSerialization` → `onSend` → `onResponse` — each hook is a named lifecycle stage. Audit logging, tenant extraction, and authorization checks have clear attachment points.

**Negative / accepted trade-offs:**

- **Learning curve.** The team has Express experience, not Fastify. Key differences: `app.register()` instead of `app.use()`, encapsulated scope (decorators don't leak up), `reply.send()` instead of `res.json()`, strict async/callback separation in plugins. Mitigation: the Nx generator produces correct Fastify boilerplate; developers interact with route handlers, not framework internals.
- **Plugin ecosystem is smaller than Express.** Express has more third-party middleware. Mitigation: all critical middleware has official Fastify equivalents (`@fastify/cors`, `@fastify/helmet`, `@fastify/rate-limit`, `@fastify/jwt`, `@fastify/swagger`, `@fastify/multipart`). For the rare case where only an Express middleware exists, `@fastify/middie` provides a compatibility bridge.
- **TypeBox is a new dependency.** The team has Zod experience from the toy-poc-sdlc-demo. TypeBox has a different API (builder pattern vs chained methods). Mitigation: TypeBox is used only in route schema definitions, not throughout the codebase. Zod remains available for frontend validation (React Hook Form) and TanStack Router search params.

---

## Follow-up actions

- [ ] Update SDK packages to export Fastify plugins instead of Express middleware (`identityPlugin`, `tenantPlugin`, `pepPlugin`).
- [ ] Update the Nx module generator to scaffold Fastify-based service wrappers.
- [ ] Evaluate `@fastify/swagger` + `@fastify/swagger-ui` for auto-generating OpenAPI docs from TypeBox route schemas — potential to replace manual spec authoring for implementation-driven endpoints.
- [ ] Evaluate whether the BFF (`services/bff/`) should also use Fastify or whether Hono is a better fit for its proxy/aggregation workload.

## Links

- Related ADRs: [ADR-0016](./0016-polyglot-nx-monorepo-spec-first-contracts.md) (Nx monorepo, spec-first contracts)
- Related LLD: [Repo Structure — Monorepo Setup](../lld/repo-structure/01-monorepo-setup.md) §5, §10, §11
