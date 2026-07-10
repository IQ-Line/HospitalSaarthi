# Build context: repo root (same as all other HIMS Dockerfiles).
# COPY paths are repo-relative.
#
# Builds the thin Master Data service host (services/master-data-svc), which
# imports the Master Data module (modules/master-data) via an editable uv path
# dependency. Mirrors services/opd-svc/Dockerfile.

FROM python:3.12-slim

WORKDIR /app

RUN pip install --no-cache-dir uv

# Copy the module source first so the path dependency resolves, plus the authz
# SDK the module depends on (nested uv path source).
COPY modules/master-data /app/modules/master-data
COPY packages/py-sdk-authz /app/packages/py-sdk-authz

# Then the service wrapper.
COPY services/master-data-svc/pyproject.toml services/master-data-svc/uv.lock* /app/services/master-data-svc/
COPY services/master-data-svc/src /app/services/master-data-svc/src

WORKDIR /app/services/master-data-svc
RUN uv sync --frozen --no-dev || uv sync --no-dev

EXPOSE 8010

CMD ["uv", "run", "uvicorn", "master_data_svc.main:app", "--host", "0.0.0.0", "--port", "8010"]
