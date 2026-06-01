#!/usr/bin/env bash
# inject-notify-granted.sh — Simulate CM POSTing /hiu/consent/request/notify (status=GRANTED)
# Usage: inject-notify-granted.sh <consentRequestId> [consentArtefactId]
#
# Requires: adapter service running on :3007 with ABDM_M3_MOCK_GATEWAY=true.
set -euo pipefail

BASE_URL="${ABDM_ADAPTER_BASE_URL:-http://localhost:3007}"
TENANT_ID="${ABDM_TEST_TENANT_ID:-${ABDM_DEV_TENANT_ID:-00000000-0000-4000-8000-0000000000aa}}"
HIU_ID="${ABDM_TEST_HIU_ID:-SBX_TEST_HIU_001}"
CONSENT_REQUEST_ID="${1:?usage: $0 <consentRequestId> [consentArtefactId]}"
CONSENT_ARTEFACT_ID="${2:-CON-TEST-$(uuidgen)}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FIXTURE="$SCRIPT_DIR/../../test-fixtures/m3/hiu/notify-granted.json"

REQUEST_ID="$(uuidgen)"
TIMESTAMP="$(date -u +%Y-%m-%dT%H:%M:%S.000Z)"

BODY="$(jq --arg crid "$CONSENT_REQUEST_ID" --arg caid "$CONSENT_ARTEFACT_ID" \
  '.notification.consentRequestId = $crid | .notification.consentArtefacts = [{id: $caid}]' "$FIXTURE")"

curl -sS -X POST "$BASE_URL/api/v3/hiu/consent/request/notify" \
  -H "Content-Type: application/json" \
  -H "REQUEST-ID: $REQUEST_ID" \
  -H "TIMESTAMP: $TIMESTAMP" \
  -H "X-HIU-ID: $HIU_ID" \
  -H "X-CM-ID: sbx" \
  -H "x-tenant-id: $TENANT_ID" \
  -d "$BODY" \
  -w "\nHTTP %{http_code}\nconsentArtefactId=$CONSENT_ARTEFACT_ID\n"
