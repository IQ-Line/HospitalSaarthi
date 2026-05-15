# Phase 1A shared SDK note (User Management)

Context: User Management Phase 1A required small updates in shared SDK packages (`@hims/ts-sdk-identity`, `@hims/ts-sdk-authz`).

- `@hims/ts-sdk-identity` is the single owner of `FastifyRequest.user` typing (`Principal`) so all services and SDKs share one request identity contract.
- `@hims/ts-sdk-authz` now consumes that shared `Principal` contract instead of redefining `request.user`.
- These SDK edits are intentionally generic and reusable; no service-specific logic was added to shared packages.
- Cerbos behavior is unchanged except for existing resolver semantics used by host services.

Rationale: keeping identity typing centralized in the identity SDK avoids duplicated Fastify augmentations and reduces drift between modules that integrate authn/authz.
