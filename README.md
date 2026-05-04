# HIMS Platform

Integration-first, highly modular Hospital Information Management System.

## Quick start

```bash
git clone <repo>
cd HospitalSaarthi
make setup    # installs deps, starts docker, runs migrations
make dev      # starts all services
```

See `make help` for all available targets.

## Architecture

Architecture documentation lives in [`docs/architecture/`](docs/architecture/README.md). Start with the [system overview](docs/architecture/hld/01-system-overview.md), then the [monorepo developer guide](docs/architecture/lld/repo-structure/01-monorepo-setup.md).

## Repository layout

| Directory | Purpose |
|-----------|---------|
| `specs/` | Language-agnostic OpenAPI and event contracts |
| `packages/` | Shared TypeScript SDK + generated clients |
| `modules/` | Module libraries — pure business logic, no deployment opinion |
| `services/` | Deployment wrappers (Fastify for backend, Vite for frontend) |
| `infra/` | Docker, Cerbos policies, database config |
| `tools/` | Nx generators and CI scripts |
| `tests/load/` | k6 load test scenarios |
| `docs/` | Architecture documentation |

## Status

**Phase 0 — Monorepo foundation.** Setting up the workspace, SDK packages, and infrastructure.
