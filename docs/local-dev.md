# Local development

Deterministic setup for the enterprise authorization demo stack. Authorization is **capability-key-first** only: the SPA hydrates from `GET /api/user-management/auth/principal` → `attributes.capabilities[]`. No permission maps or dev-token bypasses.

## Prerequisites

- Node.js 24+, pnpm 10+, Docker
- `make` (Git Bash / WSL on Windows), **or** PowerShell: `.\scripts\bootstrap.ps1`

## 1. Environment

```bash
cp .env.example .env
make env-init   # optional: copies services/*/.env.example when missing
```

Edit `.env` only if ports clash. Required keys are documented in `.env.example`:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | `hims_dev` — shared DB; modules use schemas (`configurator`, `user_management`, `empi`, …) |
| `MASTER_DATA_DATABASE_URL` | `hims-master` (Alembic + catalog API) |
| `CONFIGURATOR_URL` / `MASTER_DATA_URL` | UM entitlement lookups |
| `BETTER_AUTH_SECRET` | ≥32 chars; better-auth + seed |
| `CERBOS_URL` | gRPC PDP `localhost:3593` |
| `VITE_CERBOS_URL` | Browser HTTP `http://localhost:3592` |
| `JWT_ISSUER` / `JWKS_URL` / `AUTH_BASE_URL` | BFF origin (`http://localhost:3000`) |
| `WEB_PUBLIC_ORIGIN` | Vite origin for better-auth cookies (`http://localhost:5173`) |
| `ENABLE_AUTH` | `true` for EMPI JWT enforcement |
| `PLATFORM_DEV_BOOTSTRAP` | `false` — use seed, not service bootstrap |

## 2. One-shot bootstrap

```bash
make setup
```

Runs in order:

1. `env-init` — create `.env` if missing  
2. `pnpm install`  
3. `make infra` — Postgres (5433), PgBouncer (6432), Cerbos (3592 HTTP / 3593 gRPC)  
4. `make db-create-modules` — creates `hims-master` (catalog DB) if using split DBs  
5. `make db-migrate` — schemas on `hims_dev` + master-data (Alembic on `hims-master`)  
6. `make seed` — `pnpm sync:capabilities` then `pnpm seed` (UM catalog sync, Configurator tenant, dev users, Cerbos smoke check)  

To reset everything:

```bash
make db-reset
```

## 3. Start the demo stack

```bash
pnpm dev:web-stack
```

| Service | Port | URL |
|---------|------|-----|
| Web (Vite) | 5173 | http://localhost:5173 |
| BFF | 3000 | http://localhost:3000 |
| User Management | 3005 | (proxied via BFF) |
| Configurator | 3001 | (proxied via BFF) |
| Master Data | 8010 | (proxied via BFF `/api/v1/master-data`) |
| Cerbos HTTP | 3592 | Playground / `@cerbos/http` |
| Cerbos gRPC | 3593 | Node PDP |

Optional: `npx nx run empi-svc:serve` (port 3002) when testing EMPI with `ENABLE_AUTH=true`.

## 4. Sign in

After seed (`make setup`):

| Persona | Email | Password |
|---------|-------|----------|
| Platform operator | `platform@hospitalsaarthi.dev` | `password` |
| Tenant admin | `admin@hospitalsaarthi.dev` | `password` |
| Readonly | `readonly@hospitalsaarthi.dev` | `password` |
| Clinical | `clinical@hospitalsaarthi.dev` | `password` |

DEV login shortcuts on `/login` use the same better-auth path as manual entry.

## 5. Authorization flow (verify)

1. Sign in → JWT with `iq_tenant_id`  
2. `GET /api/user-management/auth/principal` → `attributes.capabilities[]`  
3. Sidebar filtered by capabilities + Configurator `tenant_modules`  
4. UM APIs enforced by Cerbos on `user-management-svc`  

Quick checks:

```bash
# Modules catalog (after master-data is up)
curl -s http://localhost:3000/api/v1/master-data/modules | head

# Principal (replace TOKEN)
curl -s -H "Authorization: Bearer TOKEN" \
  http://localhost:3000/api/user-management/auth/principal
```

## 6. Seed order (what `make seed` does)

1. **Master Data** — resolve module UUIDs from `global_master.modules` (catalog owned by Alembic, including `030_demo_authorization_catalog`)  
2. **Configurator** — dev org/tenant + `tenant_modules` for demo slugs  
3. **User Management** — runtime capabilities, roles, `user_capabilities`, better-auth users  
4. **Cerbos** — smoke check for platform operator (`user.create`, `role.create`, `role.assign`)  

Catalog is **not** inserted by the seed script. Do not run ad-hoc SQL against `public.modules`.

## Windows (no `make`)

```powershell
.\scripts\bootstrap.ps1          # same as make setup (migrate + seed)
.\scripts\bootstrap.ps1 -Reset   # docker down -v, recreate module DBs, migrate, seed
pnpm dev:web-stack
```

Module databases use `infra/db/create-module-databases.sql` (Citus-safe `\gexec` pattern — not PL/pgSQL `DO` blocks).

## 7. Troubleshooting

| Symptom | Fix |
|---------|-----|
| `EADDRINUSE` on 3000 / 3001 / 3005 / 5173 / 8010 | Re-run `pnpm dev:web-stack` (runs `tools/dev-stack-prep.mts` to free stale listeners first). Or kill manually: `netstat -ano \| findstr :3000` then `taskkill /PID <pid> /F` (Windows) |
| Vite on 5174/5175 instead of 5173 | Stale Vite left 5173 busy; `dev-stack-prep` frees 5173–5175. Set `WEB_DEV_PORT=5173` in `.env` |
| Nx output hard to read | `dev:web-stack` uses `--output-style=stream` — each line is prefixed with the project name (`bff:`, `web:`, …) |
| `CREATE DATABASE cannot be executed from a function` | Re-pull `create-module-databases.sql` (uses `\gexec`, not `DO $$`) |
| Orphaned `026_um_catalog_seed` on `hims-master` | `make db-drop-modules` then `make db-create-modules` + `make db-migrate`, or `.\scripts\bootstrap.ps1 -Reset` |
| UM fails boot: `CONFIGURATOR_URL` / `MASTER_DATA_URL` | Set in root `.env` |
| Seed: schema `global_master` not found | Run `make db-migrate` (master-data Alembic) |
| Seed: module slug not found | Ensure `MASTER_DATA_DATABASE_URL` points at `hims-master` |
| Missing `configurator` / `user_management` schema | `npx nx run configurator:db-migrate` and `user-management:db-migrate` against `DATABASE_URL` |
| `AUTH_INVALID_TOKEN` on `/auth/principal` | Align `JWT_ISSUER` / `AUTH_BASE_URL` / `BFF_PORT` / `VITE_API_BASE_URL` to the same BFF port; set `JWKS_URL` to `http://localhost:3005/api/auth/.well-known/jwks.json`; clear `sessionStorage` (`hims-dev-auth`) and sign in again |
| Login 401 / JWKS | `JWT_ISSUER` and `VITE_API_BASE_URL` must match BFF port |
| Empty nav | Re-run `make seed`; check `tenant_modules` and principal capabilities |
| Cerbos unreachable | `docker compose -f infra/docker/docker-compose.yml ps` |
| EMPI 401 with auth on | `JWKS_URL` must include `/api/auth/` path |
| Master Data `/modules` 500 or 503 | Check logs for `SQLAlchemy engine bound to` (should be `.../hims-master`). Run `make db-migrate`. Restart `pnpm dev:web-stack` |
| UM svc: `action segment "access" is not recognized` | Re-run `pnpm seed` after pulling latest UM capability-key validation |
| API `AUTHZ_FORBIDDEN` on User Management after capability-key migration | `pnpm sync:capabilities`, `pnpm purge:legacy-capabilities`, `pnpm seed:user-management-dev`, then `docker compose -f infra/docker/docker-compose.yml restart cerbos`. Sign out and sign back in. |

## Related

- [Development authentication](./architecture/auth/development-authentication.md)
- [Capability key first](./architecture/authorization/capability-key-first.md)
- [Port allocation](./dev/port-allocation.md)
