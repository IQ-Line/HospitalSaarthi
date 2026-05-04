# Master Data Local Setup

This guide starts the Python Master Data service locally on Ubuntu.

## Prerequisites

- Docker and Docker Compose plugin
- Python available through `uv`
- Optional: Node 24 and pnpm for Nx commands

## 1. Install `uv`

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
source ~/.bashrc
uv --version
```

## 2. Start Local Infrastructure

From the repo root:

```bash
cd /home/sunil-tyagi/HospitalSaarthi
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

From the Master Data module directory:

```bash
cd /home/sunil-tyagi/HospitalSaarthi/modules/master-data
cp .env.example .env
```

The default database URL is:

```text
MASTER_DATA_DATABASE_URL=postgresql+psycopg://hims:hims@localhost:5432/hims_dev
```

## 4. Install Python Dependencies

```bash
uv sync
```

## 5. Run Migrations

```bash
uv run alembic upgrade head
```

This creates `master_data.modules` and seeds the 4 core modules.

## 6. Start The API

```bash
uv run uvicorn app.main:app --host 0.0.0.0 --port 8010 --reload
```

Open:

```text
http://localhost:8010/docs
http://localhost:8010/api/master-data/health
http://localhost:8010/api/master-data/modules
```

## 7. Run Checks

```bash
uv run ruff check .
uv run pytest
```

## Optional: Use Nx

Install Node 24 with `fnm`:

```bash
curl -fsSL https://fnm.vercel.app/install | bash
source ~/.bashrc
fnm install 24
fnm use 24
node -v
```

Enable pnpm:

```bash
corepack enable
corepack prepare pnpm@10.33.0 --activate
pnpm -v
```

Install repo dependencies from the repo root:

```bash
cd /home/sunil-tyagi/HospitalSaarthi
pnpm install
```

Then run the service through Nx:

```bash
pnpm nx run master-data:migrate
pnpm nx run master-data:serve
```

Useful Nx checks:

```bash
pnpm nx run master-data:lint
pnpm nx run master-data:test
```

## Troubleshooting

If migrations cannot connect, check that the infra containers are running:

```bash
docker compose -f /home/sunil-tyagi/HospitalSaarthi/infra/docker/docker-compose.yml ps
```

If `pnpm nx ...` fails with missing Nx modules, run `pnpm install` from the repo root first.
