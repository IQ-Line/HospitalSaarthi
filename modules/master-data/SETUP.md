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

From the repo root:

```bash
docker compose -f infra/docker/docker-compose.yml up -d
```

Wait until Postgres is healthy:

```bash
docker compose -f infra/docker/docker-compose.yml ps
```

The local database from `infra/docker/docker-compose.yml` is:

```text
host: localhost
port: 5432
database: hims_dev
user: hims
password: hims
```

## 3. Configure The Service

From the repo root:

```bash
cp modules/master-data/.env.example modules/master-data/.env
```

The default database URL is:

```text
MASTER_DATA_DATABASE_URL=postgresql+psycopg://hims:hims@localhost:5432/hims_dev
```

## 4. Run via Nx (recommended)

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
http://localhost:8010/api/master-data/health
http://localhost:8010/api/master-data/modules
```

## 5. Run Directly (without Nx)

If you prefer to run without Nx:

```bash
cd modules/master-data
uv sync
uv run alembic upgrade head
uv run uvicorn app.main:app --host 0.0.0.0 --port 8010 --reload
```

## Troubleshooting

**"uv: command not found"** — install uv (step 1 above). All devs need uv on PATH for `pnpm dev` to work.

**Migrations can't connect** — check that infra containers are running:

```bash
docker compose -f infra/docker/docker-compose.yml ps
```

**"pnpm nx" fails with missing modules** — run `pnpm install` from the repo root first.

**Port 8010 already in use** — kill the existing process: `kill $(lsof -ti:8010)`
