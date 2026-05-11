# Master Data Service

Python FastAPI implementation of the HIMS Master Data module.

For local setup, see [`SETUP.md`](./SETUP.md).

## Auth (deferred)

**`POST` / `PATCH` / `DELETE`** on `/modules` are open at the service layer for Phase 0; production will rely on an **API gateway** (or route deps) for JWT / API keys.

- **`BearerAuthContextMiddleware`** (`app/middleware/auth_middleware.py`): registers first in the stack; today it only marks public doc paths and does not reject traffic. Extend it when gateway JWT validation lands.
- **`resolve_superadmin_actor`** / **`require_superadmin`** (`app/middleware/auth_policy.py`, `app/api/auth.py`): use when routes opt back in. Non-JWT paths (tests, bypass, dev shared secret) return **no** actor UUID so **`created_by` / `updated_by`** stay **`NULL`** instead of fake users.
- **`RequestContextMiddleware`**: reads inbound **`X-Request-ID`** (or generates a UUID), echoes it on the response, and binds it for logging via `app/core/request_context.py`.
- **`RequestLoggingMiddleware`** (`app/middleware/request_logging.py`): logs every request (`--> METHOD path` with headers + body) and response (`<-- status METHOD path duration_ms` with headers + body). Sensitive headers (`Authorization`, `Cookie`, ...) are redacted. Toggle bodies via **`MASTER_DATA_LOG_REQUEST_BODY`** / **`MASTER_DATA_LOG_RESPONSE_BODY`**, cap with **`MASTER_DATA_LOG_MAX_BODY_BYTES`**, and skip paths via **`MASTER_DATA_LOG_SKIP_PATHS`**.
- **Logging format**: `<timestamp> <LEVEL> [<request_id>] <logger>: <message>` — every log line carries the bound `X-Request-ID`.

See **SETUP.md** (verification + auth notes) and **`tests/test_utils/test_auth_policy.py`** for policy behavior.

## First learning slice

The first surface is the **module catalog** under:

```text
/api/v1/master-data/modules
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
