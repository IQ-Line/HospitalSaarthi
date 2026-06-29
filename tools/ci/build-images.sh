#!/usr/bin/env bash
# Build and push Docker images for affected deployable apps (parallel + ACR cache).
#
# Environment:
#   REGISTRY            — e.g. acriqline.azurecr.io (required)
#   BRANCH              — e.g. dev (required; used for <branch>-latest tag)
#   AFFECTED            — JSON array of Nx project names (required), or path to .ci/affected.env
#   SHA                 — short git SHA (default: git rev-parse --short HEAD)
#   BUILD_PARALLELISM   — parallel workers (default: 4)
#   BUILDX_BUILDER      — buildx builder name (default: hims-builder)
#   SKIP_BUILDX_SETUP   — set to 1 if builder is already configured
#
# Usage:
#   REGISTRY=acriqline.azurecr.io BRANCH=dev \
#     AFFECTED='["billing-svc","web"]' ./tools/ci/build-images.sh
#
#   source .ci/affected.env && REGISTRY=... BRANCH=dev ./tools/ci/build-images.sh

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

REGISTRY="${REGISTRY:?REGISTRY is required}"
BRANCH="${BRANCH:?BRANCH is required}"
BUILD_PARALLELISM="${BUILD_PARALLELISM:-4}"
BUILDX_BUILDER="${BUILDX_BUILDER:-hims-builder}"
SHA="${SHA:-$(git rev-parse --short HEAD)}"

if [[ -f "${AFFECTED:-}" ]]; then
  # shellcheck disable=SC1090
  source "$AFFECTED"
fi

AFFECTED_JSON="${AFFECTED:?AFFECTED is required (JSON array or path to .ci/affected.env)}"

if ! echo "$AFFECTED_JSON" | jq -e 'type == "array"' >/dev/null 2>&1; then
  echo "ERROR: AFFECTED must be a JSON array, got: ${AFFECTED_JSON}" >&2
  exit 1
fi

COUNT="$(echo "$AFFECTED_JSON" | jq 'length')"
if [[ "$COUNT" -eq 0 ]]; then
  echo "No affected services — skipping image build."
  exit 0
fi

export REGISTRY BRANCH SHA BUILDX_BUILDER ROOT

setup_buildx() {
  if [[ "${SKIP_BUILDX_SETUP:-}" == "1" ]]; then
    docker buildx use "$BUILDX_BUILDER" 2>/dev/null || true
    return
  fi
  if docker buildx inspect "$BUILDX_BUILDER" >/dev/null 2>&1; then
    docker buildx use "$BUILDX_BUILDER"
  else
    echo "Creating buildx builder: ${BUILDX_BUILDER}"
    docker buildx create --name "$BUILDX_BUILDER" --driver docker-container --use
  fi
  docker buildx inspect --bootstrap >/dev/null
}

setup_buildx

echo "=== Build and push images ==="
echo "REGISTRY=${REGISTRY} BRANCH=${BRANCH} SHA=${SHA}"
echo "BUILD_PARALLELISM=${BUILD_PARALLELISM} affected_count=${COUNT}"

tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT

while IFS= read -r svc; do
  [[ -z "$svc" ]] && continue
  (
    if ! ./tools/ci/build-one-image.sh "$svc"; then
      touch "${tmpdir}/fail-${svc}"
    fi
  ) &
  while [[ "$(jobs -rp | wc -l)" -ge "$BUILD_PARALLELISM" ]]; do
    wait -n 2>/dev/null || wait
  done
done < <(echo "$AFFECTED_JSON" | jq -r '.[]')

wait || true

if compgen -G "${tmpdir}/fail-*" >/dev/null; then
  echo "ERROR: One or more image builds failed:" >&2
  for f in "${tmpdir}"/fail-*; do
    basename "$f" | sed 's/^fail-//' >&2
  done
  exit 1
fi

echo "=== All ${COUNT} image(s) built and pushed successfully ==="
