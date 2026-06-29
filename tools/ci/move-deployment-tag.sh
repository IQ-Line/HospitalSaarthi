#!/usr/bin/env bash
# Force-move last-deployed-<branch> to HEAD and push to origin.
# Run only after a successful deploy on dev/master (not on PR builds).
#
# Environment:
#   BRANCH — e.g. dev, master (required)
#
# Usage:
#   BRANCH=dev ./tools/ci/move-deployment-tag.sh

set -euo pipefail

BRANCH="${BRANCH:?BRANCH is required}"

TAG="last-deployed-${BRANCH}"
HEAD_SHA="$(git rev-parse HEAD)"

echo "=== Moving deployment tag ==="
echo "TAG=${TAG}"
echo "HEAD=${HEAD_SHA}"

git tag -f "$TAG" HEAD
git push -f origin "$TAG"

echo "Pushed ${TAG} -> ${HEAD_SHA}"
echo "Next pipeline run will use this SHA as --base for affected detection."
