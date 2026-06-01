#!/usr/bin/env bash
# inject-on-fetch.sh — Simulate CM POSTing /hiu/consent/on-fetch with signed artefact
# Usage: inject-on-fetch.sh <consentArtefactId>
set -euo pipefail

BASE_URL="${ABDM_ADAPTER_BASE_URL:-http://localhost:3007}"
TENANT_ID="${ABDM_TEST_TENANT_ID:-${ABDM_DEV_TENANT_ID:-00000000-0000-4000-8000-0000000000aa}}"
HIU_ID="${ABDM_TEST_HIU_ID:-SBX_TEST_HIU_001}"
CONSENT_ARTEFACT_ID="${1:?usage: $0 <consentArtefactId>}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FIXTURE="$SCRIPT_DIR/../../test-fixtures/m3/hiu/on-fetch-with-artefact.json"

REQUEST_ID="$(uuidgen)"
TIMESTAMP="$(date -u +%Y-%m-%dT%H:%M:%S.000Z)"

BODY="$(jq --arg cid "$CONSENT_ARTEFACT_ID" --arg req "$REQUEST_ID" \
  '.consent.consentDetail.consentId = $cid | .response.requestId = $req' "$FIXTURE")"

curl -sS -X POST "$BASE_URL/api/v3/hiu/consent/on-fetch" \
  -H "Content-Type: application/json" \
  -H "REQUEST-ID: $REQUEST_ID" \
  -H "TIMESTAMP: $TIMESTAMP" \
  -H "X-HIU-ID: $HIU_ID" \
  -H "X-CM-ID: sbx" \
  -H "x-tenant-id: $TENANT_ID" \
  -d "$BODY" \
  -w "\nHTTP %{http_code}\n"
