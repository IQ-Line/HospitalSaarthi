#!/usr/bin/env bash
# Compute deployable apps affected since last deployment.
#
# Writes diagnostics to stdout and exports BASE + AFFECTED to .ci/affected.env
# for Jenkins:  source .ci/affected.env
#
# Environment:
#   BRANCH              — e.g. dev, master (required for branch builds)
#   CHANGE_ID           — set for PR builds (optional)
#   CHANGE_TARGET       — PR merge target (default: dev)
#   FORCE_REBUILD_ALL   — true to skip --affected and rebuild every app
#
# Usage:
#   BRANCH=dev ./tools/ci/determine-affected.sh

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

BRANCH="${BRANCH:-}"
CHANGE_ID="${CHANGE_ID:-}"
CHANGE_TARGET="${CHANGE_TARGET:-dev}"
FORCE_REBUILD_ALL="${FORCE_REBUILD_ALL:-false}"

BASE=""

if [[ "$FORCE_REBUILD_ALL" == "true" ]]; then
  echo "=== Affected detection: FORCE_REBUILD_ALL=true ==="
  AFFECTED="$(npx nx show projects --type=app --json)"
else
  if [[ -n "$CHANGE_ID" ]]; then
    BASE="origin/${CHANGE_TARGET}"
    echo "=== Affected detection: PR build (CHANGE_ID=${CHANGE_ID}) ==="
  else
    if [[ -z "$BRANCH" ]]; then
      echo "ERROR: BRANCH is required for non-PR builds" >&2
      exit 1
    fi
    TAG="last-deployed-${BRANCH}"
    if git rev-parse "$TAG" >/dev/null 2>&1; then
      BASE="$TAG"
    else
      BASE="HEAD~1"
      echo "WARN: git tag '$TAG' not found — falling back to HEAD~1 (first run or tag not pushed)" >&2
    fi
    echo "=== Affected detection: branch build (BRANCH=${BRANCH}) ==="
  fi

  echo "BASE=${BASE}"
  if git rev-parse "$BASE" >/dev/null 2>&1; then
    echo "BASE_SHA=$(git rev-parse "$BASE")"
    echo "HEAD_SHA=$(git rev-parse HEAD)"
    COMMIT_COUNT="$(git rev-list --count "${BASE}..HEAD" 2>/dev/null || echo 0)"
    echo "Commits since base: ${COMMIT_COUNT}"
    if [[ "$COMMIT_COUNT" -gt 0 ]]; then
      echo "--- Recent commits since base (max 20) ---"
      git log --oneline "${BASE}..HEAD" 2>/dev/null | head -20 || true
    fi
    if [[ "$COMMIT_COUNT" -gt 50 ]]; then
      echo "WARN: ${COMMIT_COUNT} commits since last-deployed tag — affected set may include many apps." >&2
      echo "      Verify 'Move deployment tag' runs after successful deploys on ${BRANCH}." >&2
    fi
  else
    echo "WARN: BASE ref '${BASE}' could not be resolved" >&2
  fi

  AFFECTED="$(npx nx show projects --affected --base="${BASE}" --head=HEAD --type=app --json)"
fi

COUNT="$(echo "$AFFECTED" | jq 'length')"
echo "Affected app count: ${COUNT}"
echo "Affected services JSON: ${AFFECTED}"

if [[ "$COUNT" -eq 0 ]]; then
  echo "No deployable apps affected — image build stage can be skipped."
fi

mkdir -p .ci
{
  echo "BASE=${BASE}"
  # Single-quoted JSON survives: source .ci/affected.env
  printf "AFFECTED='%s'\n" "$AFFECTED"
} > .ci/affected.env

echo "Wrote .ci/affected.env"
