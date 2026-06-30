# Local port allocation

Canonical ports used by the HIMS dev stack. The source of truth for each
port is the `.env.example` file listed in the right-hand column — this doc
is a registry, not config, so changing a port here without updating the
example file is a review smell.

**Port-conflict defaults:** BFF, configurator, web, and docker Postgres use
alternate ports so other local apps can keep **3000, 3001, 5173, 5174, 5432,
5000**. See `scripts/dev-stack-ports.mts` and `pnpm start` (protected ports
list).

## Service ports

| Port  | Process                     | Source of truth                                          |
|-------|-----------------------------|----------------------------------------------------------|
| 3100  | BFF (Fastify)               | `services/bff/.env.example`                              |
| 3101  | configurator-svc            | `services/configurator-svc/.env.example`                 |
| 3002  | empi-svc                    | `services/empi-svc/.env.example`                         |
| 3003  | billing-svc                 | `services/billing-svc/.env.example`                      |
| 3005  | user-management-svc         | `services/user-management-svc/.env.example`              |
| 3006  | registration-svc            | `services/registration-svc/.env.example`                 |
| 3007  | integration-hub-svc         | `services/integration-hub-svc/.env.example`              |
| 3009  | record-foundation-svc       | `services/record-foundation-svc/.env.example`            |
| 3004  | pharmacy-svc                | `services/pharmacy-svc/.env.example`                     |
| 3008  | inventory-svc               | `services/inventory-svc/.env.example`                    |
| 5180  | web (Vite dev server)       | root `.env` (`WEB_DEV_PORT`)                             |
| 8010  | master-data (Python FastAPI)| `modules/master-data/.env.example`                       |
| 8020  | opd-svc                     | `services/opd-svc/.env.example`                          |

### Legacy / commonly conflicted ports (not used by HIMS)

| Port  | Notes |
|-------|-------|
| 3000  | Other apps — HIMS BFF uses **3100** |
| 3001  | Other apps — HIMS configurator uses **3101** |
| 5173  | Other apps — HIMS web uses **5180** |
| 5174  | Other apps — not in HIMS trusted origins |
| 5432  | Native Postgres — HIMS docker host uses **15432** |
| 5000  | Other apps — not used by HIMS |

## Infrastructure ports (docker-compose)

| Port  | Container                   | Source of truth                                          |
|-------|-----------------------------|----------------------------------------------------------|
| 15432 | postgres (Citus 12.1)       | `infra/docker/docker-compose.yml` (host:15432 → container:5432) |
| 6432  | pgbouncer                   | `infra/docker/docker-compose.yml`                        |
| 3593  | cerbos (PDP gRPC + HTTP)    | `infra/docker/docker-compose.yml`                        |
| 3592  | cerbos (admin)              | `infra/docker/docker-compose.yml`                        |
| 4318  | otel collector (LGTM)       | (out-of-tree, optional)                                  |

## Local port conflicts — what to do

If a canonical port is already taken on your machine (Grafana on 3000,
another Postgres on 5432, etc.), **do not edit the committed `.env.example`
files**. Override in a personal `.env.local` instead. Nx loads `.env.local`
before `.env`, gitignored, never seen by anyone else.

**Example — your machine already runs something on 3100:**

`services/bff/.env.local` (gitignored):
```
BFF_PORT=3110
```

Then also update any callers in your local config:

`services/web/.env.local`:
```
VITE_API_BASE_URL=http://localhost:3110
WEB_DEV_PORT=5180
```

`.env.local` (workspace root):
```
JWKS_URL=http://localhost:3110/api/auth/.well-known/jwks.json
JWT_ISSUER=http://localhost:3110
BFF_PORT=3110
```

`services/user-management-svc/.env.local`:
```
AUTH_BASE_URL=http://localhost:3110
AUTH_TRUSTED_ORIGINS=http://localhost:5180,http://localhost:5181,http://localhost:5182
```

The `.env.local` files are gitignored, so your override never reaches anyone
else. The canonical `.env.example` files keep showing the documented ports
to new developers.

Also update `scripts/dev-stack-ports.mts` if you change ports used by `pnpm start`.

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
sudo lsof -nP -iTCP -sTCP:LISTEN | grep -E ':(3100|3101|3002|3003|3004|3005|3006|3007|3009|5180|15432|6432|3593|8010|8020)'

# What ports do the .env.example files document?
grep -hE '_PORT=' services/*/.env.example
```
