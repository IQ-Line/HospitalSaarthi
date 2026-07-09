#!/usr/bin/env bash
# Build once, package N times: stage ready-to-build image contexts for a set
# of deployable services, so each image build is a cheap COPY instead of a
# full in-image pnpm install + nx build (measured: ~18 s vs ~2 min per image).
#
# Usage:
#   tools/build-images.sh <service>...
#   tools/build-images.sh $(echo "$AFFECTED" | jq -r '.[]')     # Jenkins
#
# What it does:
#   1. `pnpm install --frozen-lockfile` if node_modules is missing.
#   2. ONE `nx run-many -t build` across all requested TS services + web
#      (nx computation cache makes repeats near-free).
#   3. Per TS service: `pnpm deploy --prod` into dist-images/<svc>/app plus
#      the runtime extras (specs/openapi, registration report stylesheet) and
#      a copy of infra/docker/node-svc.thin.Dockerfile.
#      For web: the Vite dist + nginx conf + web.thin.Dockerfile.
#   4. Services with self-contained Dockerfiles (master-data, cerbos-policies,
#      opd-svc) are passed through untouched: context stays the repo root.
#
# Output: dist-images/manifest.txt, one line per service:
#   <nx-project> <image-name> <build-context> <dockerfile>
# The CI loop then builds each line with docker or kaniko, e.g.:
#   while read -r svc image ctx df; do
#     docker build -f "$df" --build-arg SERVICE_NAME="$svc" \
#       -t "$REGISTRY/$image:$SHA" "$ctx"
#   done < dist-images/manifest.txt
#
# Classification is derived from tools/dockerfile-for-svc.sh (the single
# source of truth for service→Dockerfile mapping) — no duplicated lists.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

OUT_DIR="dist-images"
[ "$#" -ge 1 ] || { echo "usage: tools/build-images.sh <service>..." >&2; exit 1; }

# --- classify each requested service via the canonical mapping ---
thin_node_svcs=()
build_web=false
passthrough_lines=()
for svc in "$@"; do
  mapping="$(./tools/dockerfile-for-svc.sh "$svc")"   # exits non-zero on unknown
  dockerfile="$(echo "$mapping" | awk '{print $1}')"
  context="$(echo "$mapping" | awk '{print $2}')"
  case "$dockerfile" in
    infra/docker/node-svc.Dockerfile) thin_node_svcs+=("$svc") ;;
    infra/docker/web.Dockerfile)      build_web=true ;;
    *)
      image="$svc"
      [ "$svc" = "cerbos-policies" ] && image="cerbos"
      passthrough_lines+=("$svc $image $context $dockerfile")
      ;;
  esac
done

# --- one install + one build for everything staged ---
if [ ! -d node_modules ]; then
  echo "== node_modules missing — running pnpm install --frozen-lockfile"
  pnpm install --frozen-lockfile
fi

nx_projects=("${thin_node_svcs[@]+"${thin_node_svcs[@]}"}")
$build_web && nx_projects+=(web)
if [ "${#nx_projects[@]}" -gt 0 ]; then
  echo "== nx build: ${nx_projects[*]}"
  npx nx run-many -t build -p "$(IFS=,; echo "${nx_projects[*]}")"
fi

mkdir -p "$OUT_DIR"
manifest="$OUT_DIR/manifest.txt"
: > "$manifest"

# --- stage TS service contexts ---
for svc in "${thin_node_svcs[@]+"${thin_node_svcs[@]}"}"; do
  stage="$OUT_DIR/$svc"
  echo "== staging $stage"
  rm -rf "$stage"
  mkdir -p "$stage/specs"

  # --config.node-linker=hoisted: same rationale as node-svc.Dockerfile — the
  # bundled dist/main.js must resolve transitive npm deps from a flat layout.
  pnpm --filter "@hims/$svc" deploy --prod --config.node-linker=hoisted "$stage/app"

  # On branches that still ship registration-reports, its stylesheet must sit
  # beside dist/main.js at runtime. (dev--improved-v1 deleted the package —
  # reports go through pdf-platform — so the guard is a no-op there.)
  if [ "$svc" = "registration-svc" ] && [ -f packages/registration-reports/src/report-print.css ]; then
    cp packages/registration-reports/src/report-print.css "$stage/app/dist/report-print.css"
  fi

  cp -r specs/openapi "$stage/specs/openapi"
  cp infra/docker/node-svc.thin.Dockerfile "$stage/Dockerfile"
  echo "$svc $svc $stage $stage/Dockerfile" >> "$manifest"
done

# --- stage web context ---
if $build_web; then
  stage="$OUT_DIR/web"
  echo "== staging $stage"
  rm -rf "$stage"
  mkdir -p "$stage"
  cp -r services/web/dist "$stage/dist"
  cp infra/docker/web-nginx.conf "$stage/web-nginx.conf"
  cp infra/docker/web.thin.Dockerfile "$stage/Dockerfile"
  echo "web web $stage $stage/Dockerfile" >> "$manifest"
fi

# --- passthrough services keep their self-contained Dockerfiles ---
for line in "${passthrough_lines[@]+"${passthrough_lines[@]}"}"; do
  echo "$line" >> "$manifest"
done

echo "== done. Build manifest:"
cat "$manifest"
