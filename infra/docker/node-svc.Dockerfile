# syntax=docker/dockerfile:1.7
# Shared multi-stage Dockerfile for all HIMS Node.js services.
#
# Usage:
#   docker build \
#     -f infra/docker/node-svc.Dockerfile \
#     --build-arg SERVICE_NAME=billing-svc \
#     -t hims.azurecr.io/billing-svc:<sha> \
#     .
#
# Build context MUST be the repo root.
#
# Stage layout (deps is identical for every SERVICE_NAME — shared via buildcache):
#   base → deps (workspace pnpm install) → builder (nx build + deploy) → runtime

ARG NODE_VERSION=24
ARG PNPM_VERSION=10.33.0

# ---------- base: node + pnpm ----------
FROM acriqline.azurecr.io/node:24-bookworm-slim AS base
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate
WORKDIR /repo

# ---------- deps: full workspace install (cacheable across all TS services) ----------
FROM base AS deps

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json nx.json ./
COPY tsup.config.shared.ts ./

# Copy whole tree of services/modules/packages (their package.json files are
# needed for the pnpm filter graph). The .dockerignore keeps this manageable.
COPY services services
COPY modules modules
COPY packages packages
COPY tools tools

RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# ---------- builder: per-service compile + production deploy ----------
FROM deps AS builder
ARG SERVICE_NAME

RUN npx nx build "${SERVICE_NAME}"

# registration-reports reads this stylesheet at runtime via import.meta.url.
# The bundled registration service therefore expects it beside dist/main.js.
RUN if [ "${SERVICE_NAME}" = "registration-svc" ]; then \
      cp packages/registration-reports/src/report-print.css services/registration-svc/dist/report-print.css; \
    fi

# --config.node-linker=hoisted forces a flat node_modules layout in /out
# so the bundled dist/main.js can resolve npm deps directly. With pnpm's
# default 'isolated' linker, transitive npm deps of workspace packages
# (e.g., @fastify/swagger via @hims/ts-sdk-openapi) end up nested under
# /out/node_modules/.pnpm/ and unreachable from the bundle.
RUN pnpm --filter "@hims/${SERVICE_NAME}" deploy --prod --config.node-linker=hoisted /out

# ---------- runtime ----------
FROM acriqline.azurecr.io/node:24-bookworm-slim AS runtime
ARG SERVICE_NAME

ENV NODE_ENV=production
ENV NODE_OPTIONS=--enable-source-maps

WORKDIR /app
COPY --from=builder /out .
COPY specs/openapi /specs/openapi

# Sanity: dist/main.js must exist
RUN test -f dist/main.js || (echo "FATAL: dist/main.js missing for ${SERVICE_NAME}" && exit 1)

USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]
