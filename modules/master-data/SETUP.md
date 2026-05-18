# Master Data Local Setup

This guide starts the Python Master Data service locally on Ubuntu/WSL2.

## Prerequisites

- Docker and Docker Compose plugin
- `uv` (Python package manager)
- Node 24 and pnpm (for Nx commands — the standard way to run everything)

## 1. Install `uv`

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
source ~/.bashrc
uv --version   # should print 0.10+
```

## 2. Start Local Infrastructure

From the **repository root** (`HospitalSaarthi/`, where the `infra/` folder lives):

```bash
docker compose -f infra/docker/docker-compose.yml up -d
```

If your shell is under `modules/master-data/`, either `cd` to the repo root first or use:

```bash
docker compose -f ../../infra/docker/docker-compose.yml up -d
```

(A plain `infra/docker/...` path fails from inside `modules/master-data/` because that folder does not contain `infra/`.)

Wait until Postgres is healthy:

```bash
docker compose -f infra/docker/docker-compose.yml ps
```

The Postgres service from `infra/docker/docker-compose.yml` is reachable on the host as:

```text
host: localhost
port: 5433
database: hims_dev
user: hims
password: hims
```

(Port **5433** is published on purpose so a **native** Postgres can keep **5432** without fighting Docker.)

## 3. Configure The Service

Developer-oriented notes for the **modules** catalog (migrations, endpoints, tests) live in [`docs/MODULE-CATALOG.md`](docs/MODULE-CATALOG.md).

Use the **same workspace `.env` as the rest of the monorepo** (Fastify services, Nx `serve`). From the repo root:

```bash
cp .env.example .env   # if you do not already have a root .env
```

Edit **`.env`** at the repo root and set **`MASTER_DATA_DATABASE_URL`** (see `.env.example` — same host/database as `DATABASE_URL`, with the `postgresql+psycopg://` driver prefix for SQLAlchemy).

Optional: create **`modules/master-data/.env`** only for Master Data–specific overrides; values there override the workspace file for duplicate keys.

**API base path:** Every HTTP route is under **`MASTER_DATA_API_PREFIX`**, default **`/api/v1/master-data`** (major version `v1` in the URL — required). Example health URL: `http://localhost:8010/api/v1/master-data/health`. If an older `.env` still has `/api/master-data`, update it or you will get **404** on clients that expect **`/api/v1/master-data`**.

### Database URL (switching environments)

The app and Alembic read **`MASTER_DATA_DATABASE_URL`** from:

1. **Real environment variables** (highest priority — use this in CI or hosted deploys).
2. **`.env` at the repository root** (same pattern as Nx/Fastify local dev).
3. **`modules/master-data/.env`** (optional local overrides).

The connection string is standard SQLAlchemy/psycopg. Same migrations apply to **Docker**, **native Postgres**, or **hosted** Postgres as long as the URL points at the correct server and database.

| Scenario | Typical URL shape |
|----------|-------------------|
| Docker Compose in this repo | `postgresql+psycopg://hims:hims@localhost:5433/hims_dev` |
| Native Postgres / pgAdmin | `postgresql+psycopg://USER:PASSWORD@localhost:5432/DATABASE` — database name must match exactly (e.g. `hims-master` with a hyphen). |
| Hosted / cloud | Same pattern; add `?sslmode=require` if the provider requires TLS. |

**Ports:** Compose publishes Postgres on host **5433**; native Postgres can stay on **5432**. Point `MASTER_DATA_DATABASE_URL` at the port your database actually uses.

The default in the repo **`.env.example`** (root) and **`modules/master-data/.env.example`** matches Docker Compose:

```text
MASTER_DATA_DATABASE_URL=postgresql+psycopg://hims:hims@localhost:5433/hims_dev
```

### Why `host=/var/run/postgresql` fails

That Unix socket is created only when **PostgreSQL is installed and running on the OS** (package `postgresql`). If Alembic reports **No such file or directory** for `/var/run/postgresql`, there is **no local server** using that socket — often everything on your machine is **Docker-only** on TCP. Use a **`localhost:PORT`** URL (Docker), not a socket URL.

### Database name `hims-master` on Docker

Compose creates **`hims_dev`** by default. To use the name **`hims-master`** with the **same** Docker server as the repo (user **`hims`**), create the database once:

```bash
docker exec -it hims-postgres psql -U hims -d hims_dev -c 'CREATE DATABASE "hims-master";'
```

If it already exists, PostgreSQL will error — that is safe to ignore. Then set:

```text
MASTER_DATA_DATABASE_URL=postgresql+psycopg://hims:hims@localhost:5433/hims-master
```

Use port **5432** instead of **5433** only if `docker ps` shows Postgres mapped to **5432** on the host.

## 4. Database migrations (any environment)

Alembic applies the same revisions everywhere — **CI**, **laptop**, or **server** — as long as **`MASTER_DATA_DATABASE_URL`** points at the correct Postgres. There is no separate “Docker migration” vs “local migration”; only the URL changes.

**Checklist**

1. Postgres is running and reachable (see §2–§3 for Docker vs native ports).
2. `MASTER_DATA_DATABASE_URL` is set (shell env **overrides** `.env` files).
3. Python deps: `pnpm nx run master-data:setup` **or** `cd modules/master-data && uv sync`.

**Apply migrations**

From the **repository root**:

```bash
pnpm nx run master-data:migrate
```

From **`modules/master-data`** only:

```bash
cd modules/master-data
uv run alembic upgrade head
```

To see current revision:

```bash
cd modules/master-data
uv run alembic current
```

## 5. Run via Nx (recommended)

From the repo root:

```bash
pnpm nx run master-data:setup     # installs Python deps via uv sync
pnpm nx run master-data:migrate   # runs alembic upgrade head
pnpm nx run master-data:serve     # starts uvicorn on port 8010
```

Lint and test:

```bash
pnpm nx run master-data:lint
pnpm nx run master-data:test
```

The `serve`, `lint`, `test`, and `migrate` targets all depend on `setup` — Nx runs `uv sync` automatically if deps are out of date.

Open:

```text
http://localhost:8010/docs
http://localhost:8010/api/v1/master-data/health
http://localhost:8010/api/v1/master-data/meta
http://localhost:8010/api/v1/master-data/modules
```

## 6. Run Directly (without Nx)

If you prefer to run without Nx:

```bash
cd modules/master-data
uv sync
uv run alembic upgrade head
uv run uvicorn app.main:app --host 0.0.0.0 --port 8010 --reload
```

## 7. After DB or API changes — migrations, Swagger, reload

Use this when you (or `git pull`) **add columns/tables**, change **routes/schemas**, or update the **OpenAPI** contract.

### Do you need to stop `uvicorn`?

| Situation | Stop server? |
|-----------|----------------|
| Running **`uv run alembic upgrade head`** | **No.** Migrations are a separate process; Postgres applies DDL while the app keeps running. |
| Editing **Python** (`app/`, Alembic `versions/*.py`) with **`--reload`** | **No.** WatchFiles restarts the worker when you save; you see `WARNING: StatReload detected changes`. |
| Editing **only** `specs/openapi/master-data.v1.yaml` | **No** for the running process, but **Swagger UI (`/docs`) does not read that file** — see below. |
| Port stuck / odd state | **Yes** — Ctrl+C and start again. |

**Important:** The dev server **never** runs migrations for you. New tables/columns exist only after **`pnpm nx run master-data:migrate`** or **`uv run alembic upgrade head`** (same DB URL as the app).

### Order that avoids “column does not exist” errors

When you add database columns:

1. Add an **Alembic revision** under `alembic/versions/` (and apply [**§4**](#4-database-migrations-any-environment)).
2. Run **`uv run alembic upgrade head`** (or `pnpm nx run master-data:migrate`).
3. Update **SQLAlchemy models**, **Pydantic schemas**, **repositories/services**, and **FastAPI routes** — save files; **`--reload`** restarts the app.
4. Update the **normative contract** in **`specs/openapi/master-data.v1.yaml`** (spec-first in this repo) so it matches the handlers.

If you deploy code that reads new columns **before** the migration runs on that environment, API calls can fail with PostgreSQL errors until **`upgrade head`** completes there.

### Swagger / OpenAPI — what you actually see

- **`http://localhost:8010/docs`** (Swagger UI) and **`/redoc`** are generated by **FastAPI from your Python code** (routes + Pydantic models). They refresh when **reload** runs after code changes.
- **`specs/openapi/master-data.v1.yaml`** at the repo root is the **checked-in contract** for reviews and other services — it is **not** auto-loaded into `/docs` unless you wire that explicitly. **Keep YAML and code aligned** in the same change.

### Quick verification checklist

1. **DB revision:** `uv run alembic current` — should show the latest revision after you migrate.
2. **Health:** `curl -s http://localhost:8010/api/v1/master-data/health`
3. **Modules list (read):** `curl -s http://localhost:8010/api/v1/master-data/modules | head`
4. **Automated tests:** from `modules/master-data`, `uv run pytest`
5. **Interactive:** open **`/docs`**, expand **`/api/v1/master-data/modules`**, **Try it out** on list and mutating routes (no service-layer bearer today).

### Service-layer bearer (optional; off in Phase 0)

Until the platform gateway enforces identity, this service does **not** require **`Authorization`** on **`POST` / `PATCH` / `DELETE`**.

| Piece | Role |
|--------|------|
| **`BearerAuthContextMiddleware`** | Runs early; marks **`/docs`**, **`/openapi.json`**, etc. as public; **`bearer_auth_enforced`** is false until you implement rejection here or in deps. |
| **`resolve_superadmin_actor`** | Shared rules for **`require_superadmin`**. Only a real JWT **`sub`** (UUID) becomes an audit actor; test bypass / dev bearer / **`auth_disabled`** yield **`None`** (no placeholder user rows). |
| **`require_superadmin`** | FastAPI **`Depends`** — not attached to catalog routes today. |

Optional env vars for turning those paths back on are in [`.env.example`](.env.example). **`RequestContextMiddleware`** always sets **`X-Request-ID`**.

---

## 8. Troubleshooting

**"uv: command not found"** — install uv (step 1 above). All devs need uv on PATH for `pnpm dev` to work.

**Migrations can't connect** — check that infra containers are running:

```bash
docker compose -f infra/docker/docker-compose.yml ps
```

**`password authentication failed for user "postgres"`** while using local credentials — traffic on `localhost:5432` is hitting the wrong server (often an old container still mapped to 5432). Run `docker compose -f infra/docker/docker-compose.yml up -d` after pulling changes so Postgres is on host port **5433**, or stop conflicting containers.

**`database "hims_master" does not exist`** — the URL database segment must match the real name (`hims-master` uses a hyphen; `hims_master` does not).

**Same `.env` works on another computer but not this one** — TCP `127.0.0.1:5432` here is almost certainly **not the same Postgres** as on the other machine: different install, different `postgres` password, or another program (e.g. Docker) still bound to `5432`. Confirm with `ss -tlnp | grep 5432` and test the password outside Alembic:

```bash
PGPASSWORD='YOUR_PASSWORD' psql -h 127.0.0.1 -p 5432 -U postgres -d postgres -c 'SELECT 1'
```

If that fails, fix the password or point `MASTER_DATA_DATABASE_URL` at the correct host/port. Also run `env | grep MASTER_DATA` — a shell-exported URL overrides values from `.env` files.

**"pnpm nx" fails with missing modules** — run `pnpm install` from the repo root first.

**Port 8010 already in use** — kill the existing process: `kill $(lsof -ti:8010)`

**`column modules.parent_id does not exist` (or similar) on GET /modules** — the app expects a newer schema than the database. Run **`uv run alembic upgrade head`** (or `pnpm nx run master-data:migrate`) against the same database as **`MASTER_DATA_DATABASE_URL`**, then retry. Also call **`/api/v1/master-data/modules`**, not `/api/master-data/modules`, unless your `.env` still uses the old `MASTER_DATA_API_PREFIX`.

**`value too long for type character varying(32)` while running Alembic** — PostgreSQL’s `alembic_version.version_num` is `VARCHAR(32)`; revision labels must be ≤32 characters. This repo uses short revision ids (e.g. `003_soft_delete_audit`, `004_partial_unique`). If you hit this on an older branch, widen once with `ALTER TABLE alembic_version ALTER COLUMN version_num TYPE VARCHAR(128);` then rerun **`upgrade head`**.
