# OPD Service

Thin deployment wrapper for the OPD module. The composition root —
this is where concrete adapters (DB repos, event publishers, identity/authz
clients) are instantiated and injected into the module's `create_app()`
factory.

```
services/opd-svc/
├── Dockerfile
├── pyproject.toml          # depends on hims-opd via uv path source (editable)
├── project.json
└── src/opd_svc/
    ├── main.py             # ASGI entry — uvicorn opd_svc.main:app
    └── config.py           # service-only config (port etc.)
```

## Run locally

From the repo root (Postgres on `localhost:5433` per root `.env`):

```bash
cd services/opd-svc
uv sync --reinstall-package hims-opd
npx nx run opd-svc:serve   # runs opd:db-migrate first (alembic upgrade heads)
```

On deploy, ``opd-svc`` runs pending migrations at startup unless ``OPD_SKIP_MIGRATE=true``.
The OPD Alembic chain has branched revisions — always use ``heads`` (plural), not ``head``.

`hims-opd` is an **editable** path dependency — handler changes under `modules/opd/` are used at runtime.

### Verify routes

After start, this must return **200** (not 404):

```bash
curl -H "iq_tenant_id: YOUR_TENANT_UUID" "http://localhost:8020/api/v1/opd/patients?page=1&limit=10"
```

If you only see `/api/v1/opd/health` in OpenAPI, reinstall and restart:

```bash
uv sync --reinstall-package hims-opd
```

## API (phase 0)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/v1/opd/patients` | Patients queue — latest visit/prescription per patient for tenant |
| GET | `/api/v1/opd/visits` | List visits |
| GET/PUT | `/api/v1/opd/patients/{id}/prescription` | Load/save draft |
| POST | `/api/v1/opd/patients/{id}/prescription/end` | End consultation |

Or via Nx only:

```bash
npx nx run opd-svc:serve
```
