# syntax=docker/dockerfile:1.7
# Thin runtime image for the web SPA — the "build once, package N times" path.
# `nx build web` runs ONCE on the CI agent via tools/build-images.sh; this file
# only copies the prebuilt static output into nginx.
#
# Build context: dist-images/web/ as staged by tools/build-images.sh
#   dist/            Vite build output
#   web-nginx.conf   SPA-aware nginx config (from infra/docker/)
#   Dockerfile       a copy of this file
#
#   docker build -t <registry>/web:<sha> dist-images/web

FROM nginx:1.27-alpine

RUN rm -f /etc/nginx/conf.d/default.conf
COPY web-nginx.conf /etc/nginx/conf.d/default.conf
COPY dist /usr/share/nginx/html

# Sanity: the SPA entrypoint must exist
RUN test -f /usr/share/nginx/html/index.html || (echo "FATAL: index.html missing — did tools/build-images.sh stage this context?" && exit 1)

EXPOSE 8080
