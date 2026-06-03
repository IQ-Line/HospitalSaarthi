#!/usr/bin/env bash
# trigger-hip-data-flow.sh — Simulate CM POSTing /hip/health-information/request to HIP side
#
# In loopback mode (ABDM_M3_LOOPBACK_HIU=true), the HIP side reads the HIU's public key + nonce
# from abdm_m3_data_transfers (populated when the HIU data-fetch flow's start.ts ran), encrypts
# with Fidelius, and POSTs to localhost:3007/api/v3/hiu/health-information/transfer/:transferId.
#
# Usage: trigger-hip-data-flow.sh <consentArtefactId> <transferId>
set -euo pipefail

BASE_URL="${ABDM_ADAPTER_BASE_URL:-http://localhost:3007}"
TENANT_ID="${ABDM_TEST_TENANT_ID:-${ABDM_DEV_TENANT_ID:-00000000-0000-4000-8000-0000000000aa}}"
export ABDM_TEST_TENANT_ID="$TENANT_ID"
HIP_ID="${ABDM_TEST_HIP_ID:-${ABDM_X_HIP_ID:-SBX_TEST_HIP_001}}"
CONSENT_ARTEFACT_ID="${1:?usage: $0 <consentArtefactId> <transferId>}"
TRANSFER_ID="${2:?usage: $0 <consentArtefactId> <transferId>}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FIXTURE="$SCRIPT_DIR/../../test-fixtures/m3/hip/data-request-from-cm.json"

REQUEST_ID="$(uuidgen)"
TIMESTAMP="$(date -u +%Y-%m-%dT%H:%M:%S.000Z)"
CM_TRANSACTION_ID="TXN-TEST-$(uuidgen)"

# Real HIU key material from the active data transfer (mock GET exposes these fields).
TRANSFER_JSON="$(curl -sSf -H "x-tenant-id: $TENANT_ID" \
  "$BASE_URL/api/abdm/v1/m3/hiu/transfers/$TRANSFER_ID")"
HIU_PUB="$(echo "$TRANSFER_JSON" | jq -r '.hiuPublicKeyB64 // empty')"
HIU_NONCE="$(echo "$TRANSFER_JSON" | jq -r '.hiuNonceB64 // empty')"
if [[ -z "$HIU_PUB" || -z "$HIU_NONCE" || "$HIU_PUB" == "null" ]]; then
  echo "FAILED: could not read hiuPublicKeyB64/hiuNonceB64 for transfer $TRANSFER_ID" >&2
  echo "Ensure ABDM_M3_MOCK_GATEWAY=true and step 5 (data-request) completed." >&2
  exit 1
fi

DATA_PUSH_URL="$BASE_URL/api/v3/hiu/health-information/transfer/$TRANSFER_ID"

BODY="$(jq \
  --arg txn "$CM_TRANSACTION_ID" \
  --arg cid "$CONSENT_ARTEFACT_ID" \
  --arg url "$DATA_PUSH_URL" \
  --arg req "$REQUEST_ID" \
  --arg pubkey "$HIU_PUB" \
  --arg nonce "$HIU_NONCE" \
  '.transactionId = $txn
   | .hiRequest.consent.id = $cid
   | .hiRequest.dataPushUrl = $url
   | .hiRequest.keyMaterial.dhPublicKey.keyValue = $pubkey
   | .hiRequest.keyMaterial.nonce = $nonce
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
