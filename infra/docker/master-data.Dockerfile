# Build context: repo root (same as all other HIMS Dockerfiles).
# COPY paths are repo-relative.

FROM python:3.12-slim

WORKDIR /app

RUN pip install --no-cache-dir uv

COPY modules/master-data/pyproject.toml modules/master-data/uv.lock ./
RUN uv sync --frozen --no-dev

COPY modules/master-data/app ./app
COPY modules/master-data/alembic ./alembic
COPY modules/master-data/alembic.ini .

EXPOSE 8010

CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8010"]
