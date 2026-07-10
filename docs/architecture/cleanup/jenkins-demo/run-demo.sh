#!/usr/bin/env bash
# Jenkins build-speed demo: measures the HIMS-DEV image-build bottleneck locally
# with the SAME builder the pipeline uses (kaniko), against a local registry.
#
# Scenarios (service: billing-svc):
#   A  as-is Dockerfile, kaniko NO cache      (= today's pipeline)
#   B  as-is Dockerfile, kaniko WITH cache    (= shared-lib commit e0518958 flags)
#   C  fixed-layer-order Dockerfile + cache   (= pnpm fetch pattern)
#   D  build once on the agent + thin runtime image
# Each of A/B/C measures cold AND incremental (one-line source edit) builds —
# the incremental number is what a typical merge-to-dev pays per service.
#
# Prereqs: docker; local registry on 127.0.0.1:5001 (registry:2); repo root cwd.
set -uo pipefail

REPO="$(cd "$(dirname "$0")/../../../.." && pwd)"
DEMO_REL="docs/architecture/cleanup/jenkins-demo"
REG="127.0.0.1:5001"
SVC="billing-svc"
KANIKO="gcr.io/kaniko-project/executor:v1.23.2"
TOUCH_FILE="$REPO/modules/billing/src/index.ts"
RESULTS="$REPO/$DEMO_REL/RESULTS.md"
LOGDIR="$REPO/$DEMO_REL/logs"
mkdir -p "$LOGDIR"

CACHE_FLAGS=(--cache=true "--cache-repo=$REG/kaniko-cache" --cache-copy-layers --cache-run-layers --compressed-caching=false --snapshot-mode=redo)

restore() { cd "$REPO" && git checkout -- modules/billing/src/index.ts 2>/dev/null; }
trap restore EXIT

kbuild() { # $1 label  $2 dockerfile(rel)  $3 tag  [rest: extra kaniko args]
  local label="$1" df="$2" tag="$3"; shift 3
  local t0 t1 rc
  echo "=== [$label] start $(date -u +%H:%M:%S)"
  t0=$(date +%s)
  docker run --rm --network host \
    -v "$REPO:/workspace:ro" \
    "$KANIKO" \
    --context dir:///workspace \
    --dockerfile "/workspace/$df" \
    --destination "$REG/$SVC:$tag" \
    --build-arg "SERVICE_NAME=$SVC" \
    --insecure --insecure-pull \
    "$@" >"$LOGDIR/$label.log" 2>&1
  rc=$?
  t1=$(date +%s)
  echo "| $label | $((t1 - t0))s | rc=$rc |" >>"$RESULTS.rows"
  echo "=== [$label] done in $((t1 - t0))s (rc=$rc)"
  return 0
}

touch_src() { printf '\n// jenkins-demo incremental-build marker %s\n' "$1" >>"$TOUCH_FILE"; }

: >"$RESULTS.rows"
cd "$REPO"

# --- A: as-is, no cache (today) ---
kbuild "A1-asis-nocache-cold"        "$DEMO_REL/node-svc.asis.Dockerfile" "a-cold"
touch_src A
kbuild "A2-asis-nocache-incremental" "$DEMO_REL/node-svc.asis.Dockerfile" "a-incr"
restore

# --- B: as-is + kaniko cache (the e0518958 flags alone) ---
kbuild "B1-asis-cache-cold"          "$DEMO_REL/node-svc.asis.Dockerfile" "b-cold" "${CACHE_FLAGS[@]}"
touch_src B
kbuild "B2-asis-cache-incremental"   "$DEMO_REL/node-svc.asis.Dockerfile" "b-incr" "${CACHE_FLAGS[@]}"
restore

# --- C: fixed layer order + cache ---
kbuild "C1-fixed-cache-cold"         "$DEMO_REL/node-svc.fixed-layers.Dockerfile" "c-cold" "${CACHE_FLAGS[@]}"
touch_src C
kbuild "C2-fixed-cache-incremental"  "$DEMO_REL/node-svc.fixed-layers.Dockerfile" "c-incr" "${CACHE_FLAGS[@]}"
restore

# --- D: build once on the agent, thin image ---
echo "=== [D] host build start $(date -u +%H:%M:%S)"
t0=$(date +%s)
npx nx build "$SVC" --skip-nx-cache >"$LOGDIR/D-host-build.log" 2>&1
pnpm --filter "@hims/$SVC" deploy --prod --config.node-linker=hoisted "$REPO/$DEMO_REL/out-$SVC" >>"$LOGDIR/D-host-build.log" 2>&1
t1=$(date +%s)
echo "| D1-host-build-once (nx build + pnpm deploy) | $((t1 - t0))s | rc=0 |" >>"$RESULTS.rows"

t0=$(date +%s)
docker run --rm --network host \
  -v "$REPO/$DEMO_REL/out-$SVC:/workspace:ro" \
  -v "$REPO/$DEMO_REL/thin-runtime.Dockerfile:/df/Dockerfile:ro" \
  "$KANIKO" \
  --context dir:///workspace \
  --dockerfile /df/Dockerfile \
  --destination "$REG/$SVC:d-thin" \
  --insecure --insecure-pull >"$LOGDIR/D2-thin-image.log" 2>&1
rc=$?
t1=$(date +%s)
echo "| D2-thin-runtime-image | $((t1 - t0))s | rc=$rc |" >>"$RESULTS.rows"
rm -rf "$REPO/$DEMO_REL/out-$SVC"

echo "ALL SCENARIOS DONE $(date -u +%H:%M:%S)"
cat "$RESULTS.rows"
