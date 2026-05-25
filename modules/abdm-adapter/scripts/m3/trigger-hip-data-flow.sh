#!/usr/bin/env bash
# trigger-hip-data-flow.sh — Simulate CM POSTing /hip/health-information/request to HIP side
#
# In loopback mode (ABDM_M3_LOOPBACK_HIU=true), the HIP side reads the HIU's public key + nonce
# from abdm_m3_data_transfers (populated when the HIU data-fetch flow's start.ts ran), encrypts
# with Fidelius, and POSTs to localhost:3007/api/v3/hiu/health-information/transfer/:transferId.
#
# Usage: trigger-hip-data-flow.sh <consentArtefactId> [transferId]
set -euo pipefail

BASE_URL="${ABDM_ADAPTER_BASE_URL:-http://localhost:3007}"
TENANT_ID="${ABDM_TEST_TENANT_ID:-00000000-0000-0000-0000-000000000001}"
HIP_ID="${ABDM_TEST_HIP_ID:-SBX_TEST_HIP_001}"
CONSENT_ARTEFACT_ID="${1:?usage: $0 <consentArtefactId> [transferId]}"
TRANSFER_ID="${2:-TRX-TEST-$(uuidgen)}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FIXTURE="$SCRIPT_DIR/../../test-fixtures/m3/hip/data-request-from-cm.json"

REQUEST_ID="$(uuidgen)"
TIMESTAMP="$(date -u +%Y-%m-%dT%H:%M:%S.000Z)"
CM_TRANSACTION_ID="TXN-TEST-$(uuidgen)"

# Build a localhost dataPushUrl for loopback. The HIP-side use-case will either use this URL
# directly (if not set by the live HIU flow) or look up the real HIU key from the DB and rewrite
# the URL according to ABDM_M3_LOOPBACK_HIU.
DATA_PUSH_URL="$BASE_URL/api/v3/hiu/health-information/transfer/$TRANSFER_ID"

BODY="$(jq \
  --arg txn "$CM_TRANSACTION_ID" \
  --arg cid "$CONSENT_ARTEFACT_ID" \
  --arg url "$DATA_PUSH_URL" \
  --arg req "$REQUEST_ID" \
  '.transactionId = $txn
   | .hiRequest.consent.id = $cid
   | .hiRequest.dataPushUrl = $url
   | .response.requestId = $req' \
  "$FIXTURE")"

curl -sS -X POST "$BASE_URL/api/v3/hip/health-information/request" \
  -H "Content-Type: application/json" \
  -H "REQUEST-ID: $REQUEST_ID" \
  -H "TIMESTAMP: $TIMESTAMP" \
  -H "X-HIP-ID: $HIP_ID" \
  -H "X-CM-ID: sbx" \
  -H "x-tenant-id: $TENANT_ID" \
  -d "$BODY" \
  -w "\nHTTP %{http_code}\ntransferId=$TRANSFER_ID\ncmTransactionId=$CM_TRANSACTION_ID\n"
