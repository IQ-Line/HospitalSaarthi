# Local development

Deterministic setup for the enterprise authorization demo stack. Authorization is **capability-key-first** only: the SPA hydrates from `GET /api/user-management/auth/principal` → `attributes.capabilities[]`. No permission maps or dev-token bypasses.

## Prerequisites

- Node.js 24+, pnpm 10+, Docker
- `make` (Git Bash / WSL on Windows)

## 1. Environment

```bash
cp .env.example .env
make env-init   # optional: copies services/*/.env.example when missing
```

Edit `.env` only if ports clash. Required keys are documented in `.env.example`:

| Variable | Purpose |
|----------|---------|
| `USER_MGMT_DATABASE_URL` | `hims-user-management` |
| `CONFIGURATOR_DATABASE_URL` | `hims-configurator` |
| `MASTER_DATA_DATABASE_URL` | `hims-master` (Alembic + catalog API) |
| `DATABASE_URL` | `hims_dev` (EMPI, registration, billing) |
| `CONFIGURATOR_URL` / `MASTER_DATA_URL` | UM entitlement lookups |
| `BETTER_AUTH_SECRET` | ≥32 chars; better-auth + seed |
| `CERBOS_URL` | gRPC PDP `localhost:3593` |
| `VITE_CERBOS_URL` | Browser HTTP `http://localhost:3592` |
| `JWT_ISSUER` / `JWKS_URL` / `AUTH_BASE_URL` | BFF origin (`http://localhost:3000`) |
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
4. `make db-create-modules` — `hims-configurator`, `hims-user-management`, `hims-master`  
5. `make db-migrate` — configurator → user-management → empi → registration → billing → master-data (Alembic)  
6. `make seed` — `pnpm seed:user-management-dev`  

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

1. **Master Data** — supplemental `global_master` permissions + module links (modules from Alembic + frontdesk/visitpad)  
2. **Configurator** — dev org/tenant + `tenant_modules` for demo slugs  
3. **User Management** — runtime capabilities, roles, `user_capabilities`, better-auth users  
4. **Cerbos** — smoke check for platform operator (`user.create`, `role.create`, `role.assign`)  

## 7. Troubleshooting

| Symptom | Fix |
|---------|-----|
| UM fails boot: `CONFIGURATOR_URL` / `MASTER_DATA_URL` | Set in root `.env` |
| Seed: schema `global_master` not found | Run `make db-migrate` (master-data Alembic) |
| Seed: module slug not found | Ensure `MASTER_DATA_DATABASE_URL` points at `hims-master` |
| Configurator data in wrong DB | Use `CONFIGURATOR_DATABASE_URL=hims-configurator`, re-run migrate |
| Login 401 / JWKS | `JWT_ISSUER` and `VITE_API_BASE_URL` must match BFF port |
| Empty nav | Re-run `make seed`; check `tenant_modules` and principal capabilities |
| Cerbos unreachable | `docker compose -f infra/docker/docker-compose.yml ps` |
| EMPI 401 with auth on | `JWKS_URL` must include `/api/auth/` path |

## Related

- [Development authentication](./architecture/auth/development-authentication.md)
- [Capability key first](./architecture/authorization/capability-key-first.md)
- [Port allocation](./dev/port-allocation.md)
