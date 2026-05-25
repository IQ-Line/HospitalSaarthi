#!/usr/bin/env bash
# Map a service name (as it appears in nx show projects) to the Dockerfile path
# and build context used to build its image.
#
# Output (two whitespace-separated tokens): <dockerfile-path> <build-context>
#
# Usage from the Jenkinsfile loop:
#   mapping=$(./tools/dockerfile-for-svc.sh "$svc")
#   DOCKERFILE=$(echo "$mapping" | awk '{print $1}')
#   CONTEXT=$(echo "$mapping" | awk '{print $2}')
#   docker build -f "$DOCKERFILE" --build-arg SERVICE_NAME="$svc" -t "$REGISTRY/$svc:$SHA" "$CONTEXT"
#
# Exits non-zero with a message on stderr for unknown services.

set -euo pipefail

svc="${1:?usage: $0 <service-name>}"

case "$svc" in
  # TS backend services + bff — all use the shared template, context = repo root
  abdm-adapter-svc|billing-svc|configurator-svc|empi-svc|registration-svc|user-management-svc|bff)
    echo "infra/docker/node-svc.Dockerfile ."
    ;;
  web)
    echo "infra/docker/web.Dockerfile ."
    ;;
  cerbos-policies)
    echo "infra/docker/cerbos.Dockerfile ."
    ;;
  master-data|master-data-svc)
    # Python service — repo-root context, same as TS services.
    echo "infra/docker/master-data.Dockerfile ."
    ;;
  *)
    echo "ERROR: no Dockerfile mapping for service '$svc'" >&2
    echo "       update tools/dockerfile-for-svc.sh when adding new deployable services" >&2
    exit 1
    ;;
esac
