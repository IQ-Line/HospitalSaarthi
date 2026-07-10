# syntax=docker/dockerfile:1.7
# Thin runtime image for a HIMS Node.js service — the "build once, package N
# times" path. The heavy work (pnpm install, nx build, pnpm deploy) happens
# ONCE on the CI agent via tools/build-images.sh, which stages a per-service
# context directory; this file only copies the prebuilt output. Measured:
# ~18 s/image vs ~2 min for the full node-svc.Dockerfile build under kaniko.
#
# Build context: dist-images/<service>/ as staged by tools/build-images.sh
#   app/            pnpm deploy output (dist/, node_modules/, package.json)
#   specs/openapi/  OpenAPI specs (served/validated at runtime)
#   Dockerfile      a copy of this file
#
#   docker build -t <registry>/<service>:<sha> dist-images/<service>
#
# BASE_IMAGE is overridable for environments that cannot pull from the org ACR
# (local verification: --build-arg BASE_IMAGE=node:24-bookworm-slim — same image).

ARG BASE_IMAGE=acriqline.azurecr.io/node:24-bookworm-slim
FROM ${BASE_IMAGE}

ENV NODE_ENV=production
ENV NODE_OPTIONS=--enable-source-maps

WORKDIR /app
COPY app .
COPY specs/openapi /specs/openapi

# Sanity: dist/main.js must exist
RUN test -f dist/main.js || (echo "FATAL: dist/main.js missing — did tools/build-images.sh stage this context?" && exit 1)

USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]
