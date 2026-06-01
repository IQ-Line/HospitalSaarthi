FROM python:3.12-slim

WORKDIR /app

RUN pip install --no-cache-dir uv

# Copy the OPD module source first so the path dependency resolves.
COPY modules/opd /app/modules/opd

# Then the service wrapper.
COPY services/opd-svc/pyproject.toml services/opd-svc/uv.lock* /app/services/opd-svc/
COPY services/opd-svc/src /app/services/opd-svc/src
COPY infra/docker/load_baked_env_and_run.py /usr/local/bin/load_baked_env_and_run.py

WORKDIR /app/services/opd-svc
RUN uv sync --frozen --no-dev || uv sync --no-dev

# POC-only: bake root .env into the image when explicitly supplied as a
# BuildKit secret: docker build --secret id=root_env,src=.env ...
RUN --mount=type=secret,id=root_env,target=/tmp/root.env,required=false \
    if [ -f /tmp/root.env ]; then cp /tmp/root.env .env && chmod 0400 .env; fi

EXPOSE 8020

CMD ["python", "/usr/local/bin/load_baked_env_and_run.py", "uv", "run", "uvicorn", "opd_svc.main:app", "--host", "0.0.0.0", "--port", "8020"]
