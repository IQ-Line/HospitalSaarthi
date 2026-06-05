# Local port allocation

Canonical ports used by the HIMS dev stack. The source of truth for each
port is the `.env.example` file listed in the right-hand column — this doc
is a registry, not config, so changing a port here without updating the
example file is a review smell.

## Service ports

| Port  | Process                     | Source of truth                                          |
|-------|-----------------------------|----------------------------------------------------------|
| 3000  | BFF (Fastify)               | `services/bff/.env.example`                              |
| 3001  | configurator-svc            | `services/configurator-svc/.env.example`                 |
| 3002  | empi-svc                    | `services/empi-svc/.env.example`                         |
| 3003  | billing-svc                 | `services/billing-svc/.env.example`                      |
| 3005  | user-management-svc         | `services/user-management-svc/.env.example`              |
| 3006  | registration-svc            | `services/registration-svc/.env.example`                 |
| 3007  | abdm-adapter-svc            | `services/abdm-adapter-svc/.env.example`                 |
| 3008  | ipd-svc                     | `services/ipd-svc/.env.example` (when added)             |
| 5173  | web (Vite dev server)       | Vite default                                             |
| 8010  | master-data (Python FastAPI)| `modules/master-data/.env.example`                       |
| 8020  | visits-service (external)   | (external service; BFF proxy in `services/bff/.env.example`) |

## Infrastructure ports (docker-compose)

| Port  | Container                   | Source of truth                                          |
|-------|-----------------------------|----------------------------------------------------------|
| 5433  | postgres (Citus 12.1)       | `infra/docker/docker-compose.yml` (host:5433 → container:5432) |
| 6432  | pgbouncer                   | `infra/docker/docker-compose.yml`                        |
| 3593  | cerbos (PDP gRPC + HTTP)    | `infra/docker/docker-compose.yml`                        |
| 3592  | cerbos (admin)              | `infra/docker/docker-compose.yml`                        |
| 4318  | otel collector (LGTM)       | (out-of-tree, optional)                                  |

## Local port conflicts — what to do

If a canonical port is already taken on your machine (Grafana on 3000,
another Postgres on 5433, etc.), **do not edit the committed `.env.example`
files**. Override in a personal `.env.local` instead. Nx loads `.env.local`
before `.env`, gitignored, never seen by anyone else.

**Example — your machine already runs something on 3000:**

`services/bff/.env.local` (gitignored):
```
BFF_PORT=3010
```

Then also update any callers in your local config:

`services/web/.env.local`:
```
VITE_API_BASE_URL=http://localhost:3010
```

`.env.local` (workspace root):
```
JWKS_URL=http://localhost:3010/api/auth/.well-known/jwks.json
JWT_ISSUER=http://localhost:3010
```

`services/user-management-svc/.env.local`:
```
AUTH_BASE_URL=http://localhost:3010
AUTH_TRUSTED_ORIGINS=http://localhost:5173,http://localhost:5174,http://localhost:5175
```

The `.env.local` files are gitignored, so your override never reaches anyone
else. The canonical `.env.example` files keep showing the documented ports
to new developers.

## How Nx loads these

For a target run on project `<proj>`, Nx loads env files in this precedence
(first-found-wins per variable):

1. `<proj>/.env.local`               — your personal override for this service
2. `<proj>/.env`                     — copied from `<proj>/.env.example`
3. `<proj>/.env.[configuration]`     — e.g. `.env.test` for the test target
4. `.env.local`                      — your personal workspace-wide override
5. `.env`                            — copied from root `.env.example`
6. `.env.[configuration]`            — workspace-wide per-config

So a root `.env` provides defaults; a service's own `.env` overrides them
only where it needs to; `.env.local` overrides everything for personal needs.

## Verifying

```bash
# What ports are currently bound on your machine?
sudo lsof -nP -iTCP -sTCP:LISTEN | grep -E ':(3000|3001|3002|3003|3004|3005|3006|3007|5173|5433|6432|3593|8010)'

# What ports do the .env.example files document?
grep -hE '_PORT=' services/*/.env.example
```
