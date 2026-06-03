# syntax=docker/dockerfile:1.7
ARG NODE_VERSION=24
ARG PNPM_VERSION=10.33.0

FROM acriqline.azurecr.io/node:24-bookworm-slim AS builder
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate
WORKDIR /repo

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json nx.json ./
COPY services services
COPY modules modules
COPY packages packages
COPY tools tools

RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --filter "@hims/web..."

RUN npx nx build web

# Sanity: index.html must exist
RUN test -f services/web/dist/index.html || (echo "FATAL: web build did not produce index.html" && exit 1)

# ---------- runtime: nginx ----------
FROM nginx:1.27-alpine AS runtime

# Replace default config with our SPA-aware one
RUN rm -f /etc/nginx/conf.d/default.conf
COPY infra/docker/web-nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=builder /repo/services/web/dist /usr/share/nginx/html

# Run on 8080 (non-root nginx alpine image listens here by default in our config)
EXPOSE 8080

# nginx alpine has its own CMD; we keep it
