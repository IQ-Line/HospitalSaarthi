# OPD Service

Thin deployment wrapper for the OPD module. The composition root —
this is where concrete adapters (DB repos, event publishers, identity/authz
clients) are instantiated and injected into the module's `create_app()`
factory.

```
services/opd-svc/
├── Dockerfile
├── pyproject.toml          # depends on hims-opd via uv path source
├── project.json
└── src/opd_svc/
    ├── main.py             # ASGI entry — uvicorn opd_svc.main:app
    └── config.py           # service-only config (port etc.)
```

## Run locally

```bash
cd services/opd-svc
uv sync
uv run uvicorn opd_svc.main:app --host 0.0.0.0 --port 8020 --reload
```

Or via Nx from the repo root:

```bash
npx nx run opd-svc:serve
```
