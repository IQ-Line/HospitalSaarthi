FROM python:3.12-slim

WORKDIR /app

RUN pip install --no-cache-dir uv

# Copy the OPD module source first so the path dependency resolves.
COPY modules/opd /app/modules/opd

# Then the service wrapper.
COPY services/opd-svc/pyproject.toml services/opd-svc/uv.lock* /app/services/opd-svc/
COPY services/opd-svc/src /app/services/opd-svc/src

WORKDIR /app/services/opd-svc
RUN uv sync --frozen --no-dev || uv sync --no-dev

EXPOSE 8020

CMD ["uv", "run", "uvicorn", "opd_svc.main:app", "--host", "0.0.0.0", "--port", "8020"]
