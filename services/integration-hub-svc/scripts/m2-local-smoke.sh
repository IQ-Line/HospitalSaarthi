#!/usr/bin/env bash
# Local M2 smoke: simulate link-token callback + HIP initiated-link start.
# Requires integration-hub-svc on port 3007 and .env with ABDM_DEV_TENANT_ID + ABDM_X_HIP_ID.
set -euo pipefail

BASE="${BASE:-http://localhost:3007}"
TENANT="${ABDM_DEV_TENANT_ID:-00000000-0000-4000-8000-0000000000aa}"
HIP="${ABDM_X_HIP_ID:-IN3610001625}"
ABHA="${ABDM_MOCK_ABHA_ADDRESS:-test.user@sbx}"
REQ="$(uuidgen)"
TS="$(date -u +%Y-%m-%dT%H:%M:%S.000Z)"

echo "==> 1. Simulated on-generate-token callback"
curl -sS -X POST "$BASE/api/v3/hip/token/on-generate-token" \
  -H "Content-Type: application/json" \
  -H "REQUEST-ID: $REQ" \
  -H "TIMESTAMP: $TS" \
  -H "X-HIP-ID: $HIP" \
  -H "X-CM-ID: sbx" \
  -d "{
    \"abhaAddress\": \"$ABHA\",
    \"linkToken\": \"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjk5OTk5OTk5OTl9.mock\",
    \"response\": { \"requestId\": \"$REQ\" }
  }"
echo ""

echo "==> 2. Platform HIP initiated-link start"
curl -sS -X POST "$BASE/api/abdm/v1/m2/hip/initiated-link/start" \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: $TENANT" \
  -d "{
    \"abhaAddress\": \"$ABHA\",
    \"careContexts\": [
      { \"referenceNumber\": \"VISIT-SMOKE-001\", \"display\": \"Smoke test visit\" }
    ],
    \"hiType\": \"OPConsultation\",
    \"count\": 1
  }"
echo ""
echo "Done. Check logs and integration_hub.abdm_sessions / integration_hub.abdm_link_tokens."
