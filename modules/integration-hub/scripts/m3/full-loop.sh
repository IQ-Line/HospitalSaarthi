#!/usr/bin/env bash
# full-loop.sh — Drive an end-to-end M3 HIU+HIP loop in mock mode
#
# Runs all 8 steps of the 5-minute end-to-end loop documented in
# docs/architecture/lld/abdm-adapter/10-m3-mock-harness-guide.md §3.
#
# Requires:
#   - integration-hub-svc running on :3007
#   - services/integration-hub-svc/.env:
#       ABDM_M3_MOCK_GATEWAY=true
#       ABDM_M3_LOOPBACK_HIU=true
#   - PostgreSQL with M3 migration applied
#
# Exit 0 on success (transfer state = ACKNOWLEDGED), 1 otherwise.
set -euo pipefail

BASE_URL="${ABDM_ADAPTER_BASE_URL:-http://localhost:3007}"
# Match services/integration-hub-svc/.env → ABDM_DEV_TENANT_ID (export before run if needed).
TENANT_ID="${ABDM_TEST_TENANT_ID:-${ABDM_DEV_TENANT_ID:-00000000-0000-4000-8000-0000000000aa}}"
export ABDM_TEST_TENANT_ID="$TENANT_ID"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Every platform GET/POST must send x-tenant-id (inject scripts read ABDM_TEST_TENANT_ID).
TENANT_HDR=(-H "x-tenant-id: $TENANT_ID")

# NHA rejects future dateRange.to — use current UTC (not midnight).
DATE_TO="$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")"
DATE_FROM="$(date -u -d "30 days ago" +"%Y-%m-%dT%H:%M:%S.000Z")"

step() {
  echo
  echo "================================================================"
  echo "  Step $1: $2"
  echo "================================================================"
}

require_state() {
  local expected="$1" actual="$2" where="$3"
  if [[ "$actual" != "$expected" ]]; then
    echo "FAILED at $where: expected state=$expected, got state=$actual"
    exit 1
  fi
  echo "OK: state=$actual"
}

post_json() {
  local url="$1"
  local body="$2"
  local tmp
  tmp="$(mktemp)"
  local http_code
  http_code="$(curl -sS -o "$tmp" -w "%{http_code}" -X POST "$url" \
    -H "Content-Type: application/json" \
    -H "x-tenant-id: $TENANT_ID" \
    -d "$body")"
  if [[ "$http_code" -lt 200 || "$http_code" -ge 300 ]]; then
    echo "HTTP $http_code from POST $url" >&2
    cat "$tmp" >&2
    echo >&2
    if grep -q '"error":"Upstream"' "$tmp" 2>/dev/null; then
      echo "Hint: full-loop requires mock mode. In services/integration-hub-svc/.env set:" >&2
      echo "  ABDM_M3_MOCK_GATEWAY=true" >&2
      echo "  ABDM_M3_LOOPBACK_HIU=true" >&2
      echo "Then restart: npx nx run integration-hub-svc:serve" >&2
    fi
    rm -f "$tmp"
    exit 1
  fi
  cat "$tmp"
  rm -f "$tmp"
}

# -----------------------------------------------------------------------------
step 1 "Start consent request"
SESSION=$(post_json "$BASE_URL/api/abdm/v1/m3/hiu/consent/request" "{
  \"patientAbhaAddress\": \"test.user@sbx\",
  \"purpose\": \"CAREMGT\",
  \"hiTypes\": [\"OPConsultation\"],
  \"dateRange\": { \"from\": \"$DATE_FROM\", \"to\": \"$DATE_TO\" }
}" | jq -r '.sessionId')

CONSENT_REQUEST_ID=$(curl -sSf "${TENANT_HDR[@]}" \
  "$BASE_URL/api/abdm/v1/m3/hiu/consent/request/$SESSION" \
  | jq -r '.consentRequestId')
echo "SESSION=$SESSION"
echo "CONSENT_REQUEST_ID=$CONSENT_REQUEST_ID"

# -----------------------------------------------------------------------------
step 2 "Inject on-init (CM acks)"
bash "$SCRIPT_DIR/inject-on-init.sh" "$CONSENT_REQUEST_ID"
sleep 0.5
STATE=$(curl -sSf "${TENANT_HDR[@]}" \
  "$BASE_URL/api/abdm/v1/m3/hiu/consent/request/$SESSION" | jq -r '.state')
require_state "AWAITING_PATIENT_APPROVAL" "$STATE" "step 2"

# -----------------------------------------------------------------------------
step 3 "Inject notify-granted (patient approves)"
CONSENT_ID="CON-TEST-$(uuidgen)"
bash "$SCRIPT_DIR/inject-notify-granted.sh" "$CONSENT_REQUEST_ID" "$CONSENT_ID"
sleep 1   # handler does an async /fetch outbound
echo "CONSENT_ID=$CONSENT_ID"

# -----------------------------------------------------------------------------
step 4 "Inject on-fetch (CM returns signed artefact)"
bash "$SCRIPT_DIR/inject-on-fetch.sh" "$CONSENT_ID"
sleep 0.5
STATE=$(curl -sSf "${TENANT_HDR[@]}" \
  "$BASE_URL/api/abdm/v1/m3/hiu/consent/request/$SESSION" | jq -r '.state')
require_state "CONSENT_GRANTED" "$STATE" "step 4"

# -----------------------------------------------------------------------------
step 5 "Start data request"
TRANSFER_ID=$(post_json "$BASE_URL/api/abdm/v1/m3/hiu/data-request" \
  "{\"consentId\":\"$CONSENT_ID\"}" | jq -r '.transferId')
echo "TRANSFER_ID=$TRANSFER_ID"

# -----------------------------------------------------------------------------
step 6 "Inject on-request (CM acks data request)"
bash "$SCRIPT_DIR/inject-on-data-request.sh" "$TRANSFER_ID"
sleep 0.5
STATE=$(curl -sSf "${TENANT_HDR[@]}" \
  "$BASE_URL/api/abdm/v1/m3/hiu/transfers/$TRANSFER_ID" | jq -r '.state')
require_state "AWAITING_PUSH" "$STATE" "step 6"

# -----------------------------------------------------------------------------
step 7 "Trigger HIP data flow (loopback to our own HIU receiver)"
bash "$SCRIPT_DIR/trigger-hip-data-flow.sh" "$CONSENT_ID" "$TRANSFER_ID"
sleep 4   # HIP side runs assemble → encrypt → POST → notify, then HIU runs receive → decrypt → store

# -----------------------------------------------------------------------------
step 8 "Verify HIU transfer completed and bundle stored"
RESULT=$(curl -sSf "${TENANT_HDR[@]}" \
  "$BASE_URL/api/abdm/v1/m3/hiu/transfers/$TRANSFER_ID")
STATE=$(echo "$RESULT" | jq -r '.state')
echo "Final state: $STATE"
if [[ "$STATE" != "ACKNOWLEDGED" ]]; then
  echo "FAILED: transfer did not reach ACKNOWLEDGED"
  echo "$RESULT" | jq .
  exit 1
fi
echo
echo "=============================="
echo "  SUCCESS — Bundle received:"
echo "=============================="
echo "$RESULT" | jq '.bundle'
