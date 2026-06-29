#!/usr/bin/env bash
# Map Dockerfile path to ACR buildcache ref suffix (under $REGISTRY/buildcache/).
#
# Usage: ./tools/ci/cache-ref-for-dockerfile.sh infra/docker/node-svc.Dockerfile

set -euo pipefail

dockerfile="${1:?usage: $0 <dockerfile-path>}"

case "$dockerfile" in
  infra/docker/node-svc.Dockerfile) echo "node-svc" ;;
  infra/docker/web.Dockerfile) echo "web" ;;
  infra/docker/master-data.Dockerfile) echo "master-data" ;;
  infra/docker/cerbos.Dockerfile) echo "cerbos" ;;
  services/opd-svc/Dockerfile) echo "opd-svc" ;;
  *)
    echo "$dockerfile" | tr '/.' '-' | tr -cd '[:alnum:]-'
    ;;
esac
