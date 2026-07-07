# Master Data Service

Thin deployment wrapper for the Master Data module. This is the composition
root — the process entry-point that imports the module's `create_app()` factory
and instantiates the served ASGI app. The module (`modules/master-data`) owns
all logic: domain models, repositories, catalog services, the API routes, and
the in-process authorization PEP (identity gate + Cerbos guards), all composed
inside `create_app()`.

```
services/master-data-svc/
├── pyproject.toml          # depends on hims-master-data via uv path source (editable)
├── project.json
└── src/master_data_svc/
    ├── main.py             # ASGI entry — uvicorn master_data_svc.main:app
    └── config.py           # service-only config (port etc.)
```

The container image is built from `infra/docker/master-data.Dockerfile`
(repo-root context, same as the other HIMS Dockerfiles).

## Run locally

From the repo root (Postgres on `localhost:5433` and Cerbos on `localhost:3592`
per the root `.env`):

```bash
cd services/master-data-svc
uv sync --reinstall-package hims-master-data
npx nx run master-data-svc:serve   # runs master-data:db-migrate first (alembic upgrade heads)
```

`hims-master-data` is an **editable** path dependency — module changes under
`modules/master-data/app/` are used at runtime.

### Verify

After start, the public health endpoint must return **200**:

```bash
curl -s http://localhost:8010/api/v1/master-data/health
```

A write without a valid bearer token must be rejected (**401**) — the identity
gate is intact:

```bash
curl -s -o /dev/null -w '%{http_code}\n' -X POST \
  http://localhost:8010/api/v1/master-data/modules
```

## Migrations

Migrations live in the module and run via its Alembic chain:

```bash
npx nx run master-data:db-migrate   # uv run alembic upgrade heads (cwd modules/master-data)
```
