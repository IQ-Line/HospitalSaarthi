# OPD Module

OPD (Out-Patient Department) module — business logic library.

Layered structure per `docs/architecture/lld/repo-structure/01-monorepo-setup.md` §2.2:

```
src/opd/
├── ports.py         # Repository Protocol interfaces
├── router.py        # Mounts handlers; exported via create_app()
├── main.py          # FastAPI app factory (no main entry point)
├── core/            # config, database engine
├── domain/          # types, value objects, entities with lifecycle
├── use_cases/       # one function per business action
├── data_access/     # SQLAlchemy repository classes implementing ports
├── http_handlers/   # FastAPI handlers — translate HTTP → use-case
├── events/          # publishers/, consumers/
└── models/          # SQLAlchemy table definitions
```

The actual deployable lives in `services/opd-svc/`. This module exports only the
`create_app(deps)` factory and the public types it owns.

The §2.2 file tree in the LLD shows files directly under `src/` for compactness;
this scaffold uses Python's standard src-layout (`src/opd/`) so imports are
`from opd.<module> import ...`.

## Setup

```bash
uv sync
uv run pytest
uv run ruff check .
uv run python -m opd.core.migrations   # alembic upgrade heads (all branches)
```

The Alembic chain has parallel branches merged at ``003_merge_opd_prescription_heads``.
Use ``upgrade heads`` (plural), not ``upgrade head`` — the latter can skip
``002_health_documents`` and leave ``opd.health_documents`` missing.

``opd-svc`` applies migrations automatically on startup unless ``OPD_SKIP_MIGRATE=true``.

## Database schema

This module owns the `opd` PostgreSQL schema. See `alembic/schema_names.py`.

**Visit identity** is not modeled here. `prescriptions.visit_id` references the same UUID as
`registration.registration.visit_id` in the [registration module](../registration/src/schema/tables.ts)
(one prescription per visit, unique constraint). There is no cross-schema foreign key.
