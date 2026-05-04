# Master Data Service

Python FastAPI implementation of the HIMS Master Data module.

For local setup, see [`SETUP.md`](./SETUP.md).

## First Learning Slice

This module starts with one read-only endpoint:

```text
GET /api/master-data/modules
```

When adding a new endpoint, follow this order:

1. Update the OpenAPI contract in `specs/openapi/master-data.v1.yaml`.
2. Add or update SQLAlchemy models in `app/models/`.
3. Add an Alembic migration in `alembic/versions/`.
4. Add response/request schemas in `app/schemas/`.
5. Add repository queries in `app/repositories/`.
6. Add business logic functions in `app/services/`.
7. Add API routes in `app/api/v1/`.
8. Add tests under `tests/`.

## Local Commands

```bash
cd modules/master-data
uv sync
uv run ruff check .
uv run pytest
uv run alembic upgrade head
uv run uvicorn app.main:app --reload --port 8010
```

From the repo root, use Nx:

```bash
npx nx run master-data:lint
npx nx run master-data:test
npx nx run master-data:serve
```
