# OPD Module & Service Scaffold — Design

**Date:** 2026-05-21
**Branch:** `doctor-opd-first`
**Status:** Approved (decisions captured below)

## Goal

Set up the empty Python + FastAPI scaffold for the OPD module and its deployment wrapper so the assigned developer can fill in schemas, domain logic, and APIs. We are **not** writing OPD business logic here.

## Decisions (from user)

| Question | Choice |
|---|---|
| Folder layout | **Doc-canonical** — `modules/opd/src/` (layered) + `services/opd-svc/` (thin wrapper). Follows `docs/architecture/lld/repo-structure/01-monorepo-setup.md` §2.2 and §5. |
| Stub depth | **Bones only** — directory tree, packaging files, `GET /health`, empty alembic versions. No domain entities, no middleware stack, no example use-case. |
| Base ref | **Merge `origin/dev` into `doctor-opd-first` first** so the scaffold lands on the current monorepo state (master-data, registration-svc, ADRs). Done. |

## Why doc-canonical and not "mirror master-data"

Master-data on `dev` is the only existing Python module and it deviates from the LLD: flat `app/` shape (`api/`, `services/`, `models/`, `schemas/`, `middleware/`, `core/`) with no `services/master-data-svc/` wrapper. The user picked doc-canonical so OPD doesn't compound that deviation. Tooling choices (uv, FastAPI, SQLAlchemy, Alembic, ruff, pytest) are still copied from master-data — only the *layout* differs.

## Layout

### `modules/opd/` — pure library

```
modules/opd/
├── .dockerignore
├── .env.example
├── .gitignore
├── README.md
├── alembic.ini
├── alembic/
│   ├── env.py
│   ├── schema_names.py        # SCHEMA = "opd"
│   ├── script.py.mako
│   └── versions/              # empty (.gitkeep)
├── pyproject.toml             # uv-managed; fastapi, sqlalchemy, alembic, pydantic-settings, pyjwt
├── project.json               # Nx targets: setup, serve, lint, test, migrate
├── src/
│   ├── __init__.py
│   ├── ports.py               # Protocol placeholder
│   ├── router.py              # mounts handlers (health only at scaffold time)
│   ├── main.py                # create_app(deps) factory
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py          # pydantic-settings reading OPD_* env
│   │   └── database.py        # SQLAlchemy engine factory
│   ├── domain/__init__.py
│   ├── use_cases/__init__.py
│   ├── data_access/__init__.py
│   ├── http_handlers/
│   │   ├── __init__.py
│   │   └── health.py          # GET /health
│   ├── events/
│   │   ├── __init__.py
│   │   ├── publishers/__init__.py
│   │   └── consumers/__init__.py
│   └── models/
│       ├── __init__.py
│       └── base.py            # DeclarativeBase + tenant_id/audit-cols mixin
└── tests/
    ├── __init__.py
    ├── conftest.py            # TestClient fixture
    ├── unit/__init__.py
    └── integration/__init__.py
```

### `services/opd-svc/` — deployment wrapper

```
services/opd-svc/
├── .env.example
├── Dockerfile                 # uses repo root build context, installs both packages
├── pyproject.toml             # depends on hims-opd via uv path source
├── project.json               # Nx serve target wraps uvicorn
└── src/
    ├── __init__.py
    ├── main.py                # imports create_app, instantiates with placeholder deps
    └── config.py              # env loading: DATABASE_URL, port, JWKS URL
```

## What is intentionally NOT included

- **Domain entities** (no `visit`, `encounter`, `prescription` types).
- **Use-cases / data-access / http-handlers** beyond health — the dev fills these.
- **Middleware stack** (auth, request-context, request-logging, error-handler) — defer.
- **OpenAPI spec at `specs/openapi/opd.v1.yaml`** — needs domain shape first; dev adds.
- **Cerbos policies** under `infra/cerbos/policies/`.
- **Alembic migration revisions** — `versions/` is empty.
- **`pulse-ui` frontend feature folder** — out of scope; this is backend scaffold only.

## Open follow-ups (not blocking scaffold)

1. Master-data is the only Python module and uses the non-canonical `app/` shape. We're not refactoring it here, but it remains a "reconcile later" item.
2. Dockerfile build context: master-data uses `modules/master-data/` as context; for OPD's split layout we use repo root. If team prefers one pattern across all Python services, master-data is the one that should change, not OPD.
3. Path dependency vs uv workspace: scaffold uses `[tool.uv.sources] hims-opd = { path = "../../modules/opd" }`. If we adopt a root-level uv workspace later, this collapses to a workspace member entry.
