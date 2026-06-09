"""Fire-and-forget Record Foundation ingest + integration-hub M2 after OPD consultation ends."""

from __future__ import annotations

import json
import logging
import urllib.error
import urllib.request
from datetime import UTC, datetime
from typing import Any
from uuid import UUID, uuid4

from opd.core.config import get_settings

logger = logging.getLogger(__name__)

OP_CONSULT_PROFILE_URL = "https://nrces.in/ndhm/fhir/r4/StructureDefinition/OpConsultRecord"
OP_CONSULT_PROFILE_VERSION = "6.5.0"


def _integration_hub_base_url() -> str | None:
    settings = get_settings()
    base = (settings.integration_hub_base_url or "").strip().rstrip("/")
    return base or None


def _record_foundation_base_url() -> str | None:
    settings = get_settings()
    base = (settings.record_foundation_base_url or "").strip().rstrip("/")
    return base or None


def op_consult_care_context_ref(visit_id: UUID) -> str:
    """Stable care-context id (legacy HIMS: visit + bundle type suffix)."""
    return f"{visit_id}_OPConsultNote"


def _tenant_headers(tenant_id: UUID) -> dict[str, str]:
    tid = str(tenant_id)
    return {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "x-tenant-id": tid,
        "iq_tenant_id": tid,
    }


def _http_json(
    *,
    method: str,
    url: str,
    tenant_id: UUID,
    body: dict[str, Any] | None = None,
    timeout: float = 30,
) -> dict[str, Any] | None:
    payload = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(
        url,
        data=payload,
        method=method,
        headers=_tenant_headers(tenant_id),
    )
    with urllib.request.urlopen(req, timeout=timeout) as res:
        raw = res.read().decode("utf-8")
        if not raw.strip():
            return None
        parsed = json.loads(raw)
        return parsed if isinstance(parsed, dict) else None


def _build_op_consult_bundle(*, care_context_ref: str, display: str) -> dict[str, Any]:
    ts = datetime.now(UTC).isoformat()
    patient_id = str(uuid4())
    composition_id = str(uuid4())
    practitioner_id = str(uuid4())
    encounter_id = str(uuid4())
    document_ref_id = str(uuid4())
    return {
        "resourceType": "Bundle",
        "type": "document",
        "timestamp": ts,
        "identifier": {
            "system": "https://www.max.in/bundle",
            "value": care_context_ref,
        },
        "entry": [
            {
                "fullUrl": f"urn:uuid:{composition_id}",
                "resource": {
                    "resourceType": "Composition",
                    "id": composition_id,
                    "status": "final",
                    "type": {"text": "OpConsultation record"},
                    "subject": {"display": display},
                    "date": ts,
                    "title": display,
                    "author": [{"reference": f"urn:uuid:{practitioner_id}"}],
                },
            },
            {
                "fullUrl": f"urn:uuid:{patient_id}",
                "resource": {
                    "resourceType": "Patient",
                    "id": patient_id,
                    "name": [{"text": "Patient"}],
                },
            },
            {
                "fullUrl": f"urn:uuid:{practitioner_id}",
                "resource": {
                    "resourceType": "Practitioner",
                    "id": practitioner_id,
                    "name": [{"text": "Practitioner"}],
                },
            },
            {
                "fullUrl": f"urn:uuid:{encounter_id}",
                "resource": {
                    "resourceType": "Encounter",
                    "id": encounter_id,
                    "status": "finished",
                    "class": {
                        "system": "http://terminology.hl7.org/CodeSystem/v3-ActCode",
                        "code": "AMB",
                        "display": "ambulatory",
                    },
                    "subject": {"reference": f"urn:uuid:{patient_id}"},
                    "period": {"start": ts},
                },
            },
            {
                "fullUrl": f"urn:uuid:{document_ref_id}",
                "resource": {
                    "resourceType": "DocumentReference",
                    "id": document_ref_id,
                    "status": "current",
                    "docStatus": "final",
                    "type": {"text": "OP consultation note"},
                    "subject": {"reference": f"urn:uuid:{patient_id}"},
                    "content": [
                        {
                            "attachment": {
                                "contentType": "text/plain",
                                "title": display,
                                "creation": ts,
                            }
                        }
                    ],
                },
            },
        ],
    }


def persist_op_consult_to_record_foundation(
    *,
    tenant_id: UUID,
    patient_id: UUID,
    visit_id: UUID,
) -> bool:
    """
    Create care context + store FHIR bundle in Record Foundation.
    Returns True when persisted (or already exists), False when skipped/unreachable.
    """
    settings = get_settings()
    if not settings.abdm_m2_enabled:
        return False

    base = _record_foundation_base_url()
    if not base:
        logger.debug("OPD Record Foundation skipped: record_foundation_base_url not configured")
        return False

    care_ref = op_consult_care_context_ref(visit_id)
    display = f"OP consultation {care_ref}"
    now = datetime.now(UTC)

    try:
        create_body = {
            "patient_id": str(patient_id),
            "source_origin": "platform_module",
            "source_system_id": "opd",
            "source_record_type": "opd_visit",
            "source_record_id": care_ref,
            "encounter_id": str(visit_id),
            "display": display,
            "period_start": now.isoformat(),
            "period_end": now.isoformat(),
            "status": "active",
        }
        create_res = _http_json(
            method="POST",
            url=f"{base}/api/record-foundation/v1/care-contexts",
            tenant_id=tenant_id,
            body=create_body,
        )
        if not create_res or "data" not in create_res:
            logger.warning(
                "Record Foundation care-context create failed for visit %s",
                visit_id,
            )
            return False

        care_context_id = create_res["data"]["id"]
        bundle_json = _build_op_consult_bundle(care_context_ref=care_ref, display=display)
        store_res = _http_json(
            method="POST",
            url=f"{base}/api/record-foundation/v1/bundles",
            tenant_id=tenant_id,
            body={
                "care_context_id": care_context_id,
                "bundle_kind": "document",
                "fhir_profile_url": OP_CONSULT_PROFILE_URL,
                "fhir_profile_version": OP_CONSULT_PROFILE_VERSION,
                "producer_kind": "platform_module",
                "producer_id": "opd",
                "bundle_json": bundle_json,
                "produced_at": now.isoformat(),
            },
        )
        if not store_res or "data" not in store_res:
            logger.warning(
                "Record Foundation bundle store failed for visit %s care_context %s",
                visit_id,
                care_context_id,
            )
            return False
        return True
    except urllib.error.HTTPError as exc:
        logger.warning(
            "Record Foundation HTTP error for visit %s: %s %s",
            visit_id,
            exc.code,
            exc.reason,
        )
    except urllib.error.URLError as exc:
        logger.warning(
            "Record Foundation unreachable for visit %s: %s",
            visit_id,
            exc.reason,
        )
    except OSError as exc:
        logger.warning("Record Foundation failed for visit %s: %s", visit_id, exc)
    return False


def trigger_m2_after_end_consultation(
    *,
    tenant_id: UUID,
    patient_id: UUID,
    visit_id: UUID,
) -> None:
    """
    Persist consultation to Record Foundation, then POST integration-hub M2 orchestration.
    Non-blocking best-effort — failures are logged only.
    """
    persist_op_consult_to_record_foundation(
        tenant_id=tenant_id,
        patient_id=patient_id,
        visit_id=visit_id,
    )

    settings = get_settings()
    if not settings.abdm_m2_enabled:
        return

    base = _integration_hub_base_url()
    if not base:
        logger.debug("OPD ABDM M2 skipped: integration_hub_base_url not configured")
        return

    url = f"{base}/api/abdm/v1/m2/orchestrate/after-care-contexts"
    care_ref = op_consult_care_context_ref(visit_id)
    body = {
        "patientId": str(patient_id),
        "careContexts": [
            {
                "referenceNumber": care_ref,
                "display": f"OP consultation {care_ref}",
                "hiType": "OPCONSULTATION",
            }
        ],
    }
    payload = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=payload,
        method="POST",
        headers=_tenant_headers(tenant_id),
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as res:
            if res.status >= 400:
                logger.warning(
                    "ABDM M2 orchestration returned HTTP %s for visit %s",
                    res.status,
                    visit_id,
                )
    except urllib.error.HTTPError as exc:
        logger.warning(
            "ABDM M2 orchestration HTTP error for visit %s: %s %s",
            visit_id,
            exc.code,
            exc.reason,
        )
    except urllib.error.URLError as exc:
        logger.warning(
            "ABDM M2 orchestration unreachable for visit %s: %s",
            visit_id,
            exc.reason,
        )
    except OSError as exc:
        logger.warning("ABDM M2 orchestration failed for visit %s: %s", visit_id, exc)
