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
| [0020](0020-master-data-catalog-dual-schema.md) | Master Data Visitpad catalogs: dual schemas (`public` vs `tenant_master`) | Accepted |
| [0021](0021-master-data-catalog-tenant-key-type.md) | Master Data catalog tenant key: UUID `iq_tenant_id` (aligned with platform) | Accepted |
| [0022](0022-immutable-fhir-document-storage.md) | Immutable FHIR Document Bundles (byte-exact storage, no UPDATE) | Proposed |
| [0023](0023-distributed-fhir-assembly.md) | Distributed FHIR assembly via per-module serialisers + central Composition | Proposed |
| [0024](0024-audit-deferred-to-pre-prod.md) | Audit deferred to pre-prod (no per-module audit tables; centralized consumer) | Accepted |
| [0025](0025-billing-module-shape-and-phasing.md) | Billing module shape & phasing (Phase 1 = 4 tables matching existing-prod) | Proposed |
| [0026](0026-fsm-lite-phase-1.md) | FSM-lite for Phase 1; defer generic engine to Phase 1.5 | Proposed |
| [0027](0027-fsm-orchestration-for-integration-hub.md) | Custom FSM engine for Integration Hub (target architecture for Phase 1.5+) | Proposed |
| [0028](0028-record-foundation-fifth-core-module.md) | Record Foundation as the fifth core platform module | Proposed |

> Numbering note: ADRs 0027 and 0028 were originally drafted as 0020 and 0021 on `feat/integration-platform-lld`. They were renumbered when that branch merged with `dev`, where Master Data's 0020 and 0021 had landed in parallel. The MADR convention is that the number is a permanent identifier; this is the first renumber in the project's history, performed to resolve the collision.

## How to use

- Each ADR captures **one** architectural decision.
- ADRs link to the HLD section that motivates them; HLD sections link back.
- Template: [0000-template.md](0000-template.md)
- Meta-ADR: [0001-record-architecture-decisions.md](0001-record-architecture-decisions.md)
