#!/usr/bin/env bash
# Map Nx project name to ACR image name.
#
# Usage: ./tools/ci/image-name-for-svc.sh billing-svc  → billing-svc
#        ./tools/ci/image-name-for-svc.sh cerbos-policies → cerbos

set -euo pipefail

svc="${1:?usage: $0 <nx-project-name>}"

case "$svc" in
  cerbos-policies) echo "cerbos" ;;
  master-data-svc) echo "master-data" ;;
  *) echo "$svc" ;;
esac
