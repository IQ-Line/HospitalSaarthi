# syntax=docker/dockerfile:1.7
# DEMO: node-svc.Dockerfile with the layer order actually fixed.
#
# The as-is Dockerfile COPYs the full services/modules/packages trees BEFORE
# `pnpm install`, so ANY source change invalidates the dependency-install layer
# and every build re-downloads + re-installs the whole tree. This variant uses
# the pnpm-canonical `pnpm fetch` pattern: only the lockfile feeds the fetch
# layer, so source changes reuse the cached store and install runs --offline.
#
# Trade-off (documented): `pnpm fetch` populates the store for the WHOLE
# workspace (not just one service's filter), so the cold build downloads more
# once — and every incremental build after it skips the download entirely.
# Base image: public node:24-bookworm-slim (org ACR mirrors the same upstream).

ARG NODE_VERSION=24
ARG PNPM_VERSION=10.33.0

# ---------- base: node + pnpm ----------
FROM node:24-bookworm-slim AS base
ARG PNPM_VERSION
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate
WORKDIR /repo

# ---------- builder ----------
FROM base AS builder
ARG SERVICE_NAME

# 1. ONLY the lockfile + workspace map feed the store fetch. This layer's cache
#    key changes only when dependencies change — never on a source edit.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
RUN pnpm fetch

# 2. Now the source trees (invalidated by any source change — but everything
#    below installs from the already-fetched store, offline).
COPY tsconfig.base.json nx.json tsup.config.shared.ts ./
COPY services services
COPY modules modules
COPY packages packages
COPY tools tools

RUN pnpm install --frozen-lockfile --offline --filter "@hims/${SERVICE_NAME}..."

RUN npx nx build "${SERVICE_NAME}"

RUN if [ "${SERVICE_NAME}" = "registration-svc" ]; then \
      cp packages/registration-reports/src/report-print.css services/registration-svc/dist/report-print.css; \
    fi

RUN pnpm --filter "@hims/${SERVICE_NAME}" deploy --prod --config.node-linker=hoisted /out

# ---------- runtime ----------
FROM node:24-bookworm-slim AS runtime
ARG SERVICE_NAME

ENV NODE_ENV=production
ENV NODE_OPTIONS=--enable-source-maps

WORKDIR /app
COPY --from=builder /out .
COPY specs/openapi /specs/openapi

RUN test -f dist/main.js || (echo "FATAL: dist/main.js missing for ${SERVICE_NAME}" && exit 1)

USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]
