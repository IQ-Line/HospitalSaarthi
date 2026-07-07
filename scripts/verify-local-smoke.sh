#!/usr/bin/env bash
# =============================================================================
# verify-local-smoke.sh — backend boot smoke for `make verify-local`
# -----------------------------------------------------------------------------
# Boots every backend `*-svc` (and the two Python services) ONE AT A TIME
# against the real local stack, polls its health endpoint until it returns
# HTTP 200, then tears the process down. Reports a pass/fail matrix and exits
# non-zero if ANY service fails to come up.
#
# NEVER a watcher: services are launched with plain `tsx src/main.ts` / bare
# `uvicorn` (no --reload, no `tsx watch`) — nx serve targets use watch mode
# which stalls WSL2, so we deliberately bypass them here.
#
# Env: the workspace-root `.env` is exported into the environment before each
# service is spawned. Some services (e.g. empi-svc) have no in-process .env
# loader and rely on ambient env; others load `.env` themselves with
# "ambient wins" semantics, so exporting is safe and consistent either way.
# =============================================================================
set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

LOG_DIR="$(mktemp -d "${TMPDIR:-/tmp}/verify-local-smoke.XXXXXX")"
HEALTH_TIMEOUT="${VL_HEALTH_TIMEOUT:-90}"   # seconds to wait per service
POLL_INTERVAL="${VL_POLL_INTERVAL:-2}"      # seconds between health polls

# --- env: export workspace-root .env -----------------------------------------
export_dotenv() {
  local f="$1"
  [ -f "$f" ] || return 0
  local line key val
  while IFS= read -r line || [ -n "$line" ]; do
    line="${line#"${line%%[![:space:]]*}"}"          # left-trim
    [ -z "$line" ] && continue
    case "$line" in \#*) continue ;; esac
    [[ "$line" != *=* ]] && continue
    key="${line%%=*}"
    key="${key//[[:space:]]/}"                        # keys never contain spaces
    val="${line#*=}"
    # strip a single pair of surrounding quotes if present
    if [[ "$val" == \"*\" || "$val" == \'*\' ]]; then
      val="${val:1:${#val}-2}"
    fi
    export "$key=$val"
  done < "$f"
}
export_dotenv "$REPO_ROOT/.env"

# db-migrate already ran (step 2 of verify-local); skip the per-service
# boot-time migrations so the smoke only proves the service *serves*.
export PHARMACY_SKIP_MIGRATE=true
export INVENTORY_SKIP_MIGRATE=true
export REGISTRATION_SKIP_MIGRATE=true
export RECORD_FOUNDATION_SKIP_MIGRATE=true

# --- process bookkeeping / teardown ------------------------------------------
declare -a SPAWNED_PIDS=()

kill_tree() {
  local p="$1" c
  for c in $(pgrep -P "$p" 2>/dev/null); do kill_tree "$c"; done
  kill -TERM "$p" 2>/dev/null || true
}

teardown() {
  local p
  for p in "${SPAWNED_PIDS[@]:-}"; do
    [ -n "$p" ] && kill_tree "$p"
  done
}
trap teardown EXIT INT TERM

port_in_use() {
  # returns 0 if something is already listening on the port
  local port="$1"
  if command -v ss >/dev/null 2>&1; then
    ss -ltn 2>/dev/null | grep -qE "[:.]${port}[[:space:]]"
  else
    curl -s -o /dev/null --max-time 1 "http://localhost:${port}/" 2>/dev/null
  fi
}

# --- results -----------------------------------------------------------------
declare -a RESULT_NAMES=()
declare -a RESULT_STATUS=()
declare -a RESULT_DETAIL=()

# run_service NAME CWD PORT HEALTHPATH -- CMD...
run_service() {
  local name="$1" cwd="$2" port="$3" hpath="$4"
  shift 4
  [ "$1" = "--" ] && shift
  local url="http://localhost:${port}${hpath}"
  local log="$LOG_DIR/${name}.log"

  printf '  %-24s port %-5s %-32s ' "$name" "$port" "$hpath"

  if port_in_use "$port"; then
    echo "SKIP/FAIL (port already in use — stop existing dev servers)"
    RESULT_NAMES+=("$name"); RESULT_STATUS+=("FAIL")
    RESULT_DETAIL+=("port ${port} already in use before boot")
    return 1
  fi

  # Spawn in a subshell that cd's into the service and execs the command, so
  # $! is the head of a killable process tree. No watch flags anywhere.
  ( cd "$cwd" && exec "$@" ) >"$log" 2>&1 &
  local pid=$!
  SPAWNED_PIDS+=("$pid")

  local deadline=$(( SECONDS + HEALTH_TIMEOUT ))
  local code=""
  while [ "$SECONDS" -lt "$deadline" ]; do
    if ! kill -0 "$pid" 2>/dev/null; then
      echo "FAIL (process exited during boot)"
      RESULT_NAMES+=("$name"); RESULT_STATUS+=("FAIL")
      RESULT_DETAIL+=("process exited before serving — see $log")
      echo "    --- last 20 lines of $log ---"
      tail -n 20 "$log" | sed 's/^/    /'
      return 1
    fi
    code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 3 "$url" 2>/dev/null || true)"
    if [ "$code" = "200" ]; then
      echo "PASS (200)"
      RESULT_NAMES+=("$name"); RESULT_STATUS+=("PASS")
      RESULT_DETAIL+=("200 in $(( SECONDS - (deadline - HEALTH_TIMEOUT) ))s")
      kill_tree "$pid"
      wait "$pid" 2>/dev/null || true
      return 0
    fi
    sleep "$POLL_INTERVAL"
  done

  echo "FAIL (timeout after ${HEALTH_TIMEOUT}s, last code=${code:-none})"
  RESULT_NAMES+=("$name"); RESULT_STATUS+=("FAIL")
  RESULT_DETAIL+=("health timeout after ${HEALTH_TIMEOUT}s — see $log")
  echo "    --- last 20 lines of $log ---"
  tail -n 20 "$log" | sed 's/^/    /'
  kill_tree "$pid"
  wait "$pid" 2>/dev/null || true
  return 1
}

TSX="$REPO_ROOT/node_modules/.bin/tsx"

echo "=================================================================="
echo " Backend boot smoke — logs in $LOG_DIR"
echo "=================================================================="

# TypeScript Fastify services (all expose /healthz). Ports fall back to the
# same defaults the service code uses when the env var is unset.
run_service bff                   services/bff                   "${BFF_PORT:-3000}"                    /healthz -- "$TSX" src/main.ts
run_service configurator-svc      services/configurator-svc      "${CONFIGURATOR_SVC_PORT:-3001}"       /healthz -- "$TSX" src/main.ts
run_service empi-svc              services/empi-svc              "${EMPI_SVC_PORT:-3002}"               /healthz -- "$TSX" src/main.ts
run_service billing-svc           services/billing-svc           "${BILLING_SVC_PORT:-3003}"            /healthz -- "$TSX" src/main.ts
run_service pharmacy-svc          services/pharmacy-svc          "${PHARMACY_SVC_PORT:-3004}"           /healthz -- "$TSX" src/main.ts
run_service user-management-svc   services/user-management-svc   "${USER_MANAGEMENT_SVC_PORT:-3005}"    /healthz -- "$TSX" src/main.ts
run_service registration-svc      services/registration-svc      "${REGISTRATION_SVC_PORT:-3006}"       /healthz -- "$TSX" src/main.ts
run_service integration-hub-svc   services/integration-hub-svc   "${INTEGRATION_HUB_SVC_PORT:-3007}"    /healthz -- "$TSX" src/main.ts
run_service inventory-svc         services/inventory-svc         "${INVENTORY_SVC_PORT:-3008}"          /healthz -- "$TSX" src/main.ts
run_service record-foundation-svc services/record-foundation-svc "${RECORD_FOUNDATION_SVC_PORT:-3009}"  /healthz -- "$TSX" src/main.ts

# Python FastAPI services — bare uvicorn (no --reload).
run_service master-data-svc       services/master-data-svc       "${MASTER_DATA_SVC_PORT:-8010}"        /api/v1/master-data/health -- uv run uvicorn master_data_svc.main:app --host 0.0.0.0 --port "${MASTER_DATA_SVC_PORT:-8010}"
run_service opd-svc               services/opd-svc               "${OPD_SVC_PORT:-8020}"                /api/v1/opd/health          -- uv run uvicorn opd_svc.main:app --host 0.0.0.0 --port "${OPD_SVC_PORT:-8020}"

# --- summary -----------------------------------------------------------------
echo
echo "=================================================================="
echo " BOOT SMOKE SUMMARY"
echo "=================================================================="
fail_count=0
for i in "${!RESULT_NAMES[@]}"; do
  printf '  %-6s %-24s %s\n' "${RESULT_STATUS[$i]}" "${RESULT_NAMES[$i]}" "${RESULT_DETAIL[$i]}"
  [ "${RESULT_STATUS[$i]}" = "FAIL" ] && fail_count=$(( fail_count + 1 ))
done
echo "------------------------------------------------------------------"
if [ "$fail_count" -eq 0 ]; then
  echo "  RESULT: PASS — all ${#RESULT_NAMES[@]} services served 200"
  echo "=================================================================="
  exit 0
else
  echo "  RESULT: FAIL — ${fail_count}/${#RESULT_NAMES[@]} services failed to boot"
  echo "  Logs preserved at: $LOG_DIR"
  echo "=================================================================="
  exit 1
fi
