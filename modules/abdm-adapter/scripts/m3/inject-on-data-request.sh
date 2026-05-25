#!/usr/bin/env bash
# inject-on-data-request.sh — Simulate CM POSTing /hiu/health-information/on-request
# Usage: inject-on-data-request.sh <transferId> [cmTransactionId]
set -euo pipefail

BASE_URL="${ABDM_ADAPTER_BASE_URL:-http://localhost:3007}"
TENANT_ID="${ABDM_TEST_TENANT_ID:-00000000-0000-0000-0000-000000000001}"
HIU_ID="${ABDM_TEST_HIU_ID:-SBX_TEST_HIU_001}"
TRANSFER_ID="${1:?usage: $0 <transferId> [cmTransactionId]}"
CM_TRANSACTION_ID="${2:-TXN-TEST-$(uuidgen)}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FIXTURE="$SCRIPT_DIR/../../test-fixtures/m3/hiu/on-request-success.json"

# Service correlates this callback back to the originating data request via response.requestId.
# Our scripts use the transferId as the original outbound REQUEST-ID for simplicity in mock mode.
REQUEST_ID="$TRANSFER_ID"
TIMESTAMP="$(date -u +%Y-%m-%dT%H:%M:%S.000Z)"

BODY="$(jq --arg txn "$CM_TRANSACTION_ID" --arg req "$REQUEST_ID" \
  '.hiRequest.transactionId = $txn | .response.requestId = $req' "$FIXTURE")"

curl -sS -X POST "$BASE_URL/api/v3/hiu/health-information/on-request" \
  -H "Content-Type: application/json" \
  -H "REQUEST-ID: $(uuidgen)" \
  -H "TIMESTAMP: $TIMESTAMP" \
  -H "X-HIU-ID: $HIU_ID" \
  -H "x-tenant-id: $TENANT_ID" \
  -d "$BODY" \
  -w "\nHTTP %{http_code}\ncmTransactionId=$CM_TRANSACTION_ID\n"
