#!/usr/bin/env bash
# DEV-ONLY: Simulate NHA consent notify → ngrok / local adapter.
# Uses a fake signature — will fail once consent artefact JWS verification is enforced (issue #3).
# Requires: abdm-adapter-svc running, ngrok http 3007, ABDM_DEV_INBOUND_SIMULATION=true in .env
set -euo pipefail

NGROK="${NGROK:-https://unbeckoned-unlikeable-zayn.ngrok-free.dev}"
ABHA="${ABHA:-kamal_kamal060606@sbx}"
HIP="${HIP:-IN3610001625}"
VISIT="${VISIT:-VISIT-2026-001}"
REQ="$(uuidgen)"
TS="$(date -u +%Y-%m-%dT%H:%M:%S.000Z)"

echo "POST $NGROK/api/v3/consent/request/hip/notify"
echo "consentId (save for HI request): $REQ"

curl -sS -w "\nHTTP:%{http_code}\n" -X POST "$NGROK/api/v3/consent/request/hip/notify" \
  -H "Content-Type: application/json" \
  -H "REQUEST-ID: $REQ" \
  -H "TIMESTAMP: $TS" \
  -H "X-HIP-ID: $HIP" \
  -H "X-CM-ID: sbx" \
  -d @- <<EOF
{
  "notification": {
    "status": "GRANTED",
    "consentId": "$REQ",
    "signature": "test-signature-stub",
    "grantAcknowledgement": true,
    "consentDetail": {
      "schemaVersion": "v3",
      "consentId": "$REQ",
      "createdAt": "2026-01-01T00:00:00.000Z",
      "patient": { "id": "$ABHA" },
      "careContexts": [
        {
          "patientReference": "$ABHA",
          "careContextReference": "$VISIT"
        }
      ],
      "purpose": { "text": "Care Management", "code": "CAREMGT", "refUri": "https://example.com" },
      "hip": { "id": "$HIP" },
      "hiu": { "id": "HIU-SANDBOX" },
      "hiTypes": ["OPConsultation"],
      "permission": {
        "accessMode": "VIEW",
        "dateRange": { "from": "2020-01-01T00:00:00.000Z", "to": "2030-01-01T00:00:00.000Z" },
        "dataEraseAt": "2030-01-01T00:00:00.000Z",
        "frequency": { "unit": "HOUR", "value": 1, "repeats": 0 }
      }
    }
  }
}
EOF
