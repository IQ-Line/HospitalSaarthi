#!/usr/bin/env bash
# Build and push a single service image (invoked by build-images.sh).
#
# Environment: REGISTRY, BRANCH, SHA (required)
# Usage: ./tools/ci/build-one-image.sh billing-svc

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

svc="${1:?usage: $0 <nx-project-name>}"
REGISTRY="${REGISTRY:?REGISTRY is required}"
BRANCH="${BRANCH:?BRANCH is required}"
SHA="${SHA:?SHA is required}"
BUILDX_BUILDER="${BUILDX_BUILDER:-hims-builder}"

start="$(date +%s)"

mapping="$(./tools/dockerfile-for-svc.sh "$svc")"
dockerfile="$(echo "$mapping" | awk '{print $1}')"
context="$(echo "$mapping" | awk '{print $2}')"
image_name="$(./tools/ci/image-name-for-svc.sh "$svc")"
cache_suffix="$(./tools/ci/cache-ref-for-dockerfile.sh "$dockerfile")"
cache_ref="${REGISTRY}/buildcache/${cache_suffix}"

echo "=== $(date -Is) START ${svc} (image=${image_name}, dockerfile=${dockerfile}) ==="

build_args=()
case "$dockerfile" in
  infra/docker/node-svc.Dockerfile)
    build_args+=(--build-arg "SERVICE_NAME=${svc}")
    ;;
esac

DOCKER_BUILDKIT=1 docker buildx build \
  "${build_args[@]}" \
  --cache-from "type=registry,ref=${cache_ref}" \
  --cache-to "type=registry,ref=${cache_ref},mode=max" \
  -f "$dockerfile" \
  -t "${REGISTRY}/${image_name}:${SHA}" \
  -t "${REGISTRY}/${image_name}:${BRANCH}-latest" \
  --push \
  "$context"

end="$(date +%s)"
echo "=== $(date -Is) DONE ${svc} in $((end - start))s ==="
