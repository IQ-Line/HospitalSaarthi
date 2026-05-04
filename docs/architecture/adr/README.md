# Architecture Decision Records

Decisions are recorded as Markdown ADRs ([MADR format](https://adr.github.io/madr/)) — one decision per file, version-controlled alongside the architecture documentation.

## Index

| ADR | Title | Status |
|-----|-------|--------|
| [0001](0001-record-architecture-decisions.md) | Record architecture decisions | Accepted |
| [0002](0002-multi-tenant-fragmentable-adoption.md) | Multi-tenant, fragmentable adoption | Proposed |
| [0003](0003-authn-better-auth-identity-adapter.md) | AuthN with better-auth + identity adapter pattern | Proposed |
| [0004](0004-authz-cerbos-sidecar.md) | AuthZ with Cerbos sidecar | Proposed |
| [0005](0005-policy-as-code-permission-data-as-config.md) | Policy-as-code, permission-data-as-config split | Proposed |
| [0006](0006-four-core-platform-modules.md) | Four core platform modules | Proposed |
| [0007](0007-empi-dedicated-platform-service.md) | EMPI as a dedicated platform service | Proposed |
| [0008](0008-module-shape-and-boundaries.md) | Module shape and boundaries | Proposed |
| [0009](0009-event-driven-inter-module-communication.md) | Event-driven inter-module communication | Proposed |
| [0010](0010-fhir-hl7-interop-standards.md) | FHIR/HL7 as interop standards | Proposed |
| [0011](0011-integration-hub-split.md) | Integration Hub split (inbound/outbound, shared control plane) | Proposed |
| [0012](0012-multi-tenancy-isolation-strategy.md) | Multi-tenancy isolation strategy | Proposed |
| [0013](0013-single-database-engine-postgresql.md) | Single database engine (PostgreSQL) | Proposed |
| [0015](0015-bff-role-zero-trust.md) | BFF role and zero-trust between modules | Proposed |
| [0016](0016-polyglot-nx-monorepo-spec-first-contracts.md) | Polyglot Nx monorepo with spec-first OpenAPI contracts | Proposed |
| [0017](0017-in-process-event-bus-phase-0.md) | InProcessEventBus as Phase 0 event transport | Proposed |
| [0018](0018-frontend-stack-zustand-tanstack-router.md) | Frontend stack: Zustand, TanStack Router, TanStack Query | Proposed |
| [0019](0019-fastify-node24-lts.md) | Fastify v5 as HTTP framework, Node.js 24 LTS as runtime | Proposed |

## How to use

- Each ADR captures **one** architectural decision.
- ADRs link to the HLD section that motivates them; HLD sections link back.
- Template: [0000-template.md](0000-template.md)
- Meta-ADR: [0001-record-architecture-decisions.md](0001-record-architecture-decisions.md)
