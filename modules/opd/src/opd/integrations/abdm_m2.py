"""Fire-and-forget M2 sync via integration-hub after OPD consultation ends."""

from __future__ import annotations

import json
import logging
import urllib.error
import urllib.request
from uuid import UUID

from opd.core.config import get_settings

logger = logging.getLogger(__name__)


def _integration_hub_base_url() -> str | None:
    settings = get_settings()
    base = (settings.integration_hub_base_url or "").strip().rstrip("/")
    return base or None


def op_consult_care_context_ref(visit_id: UUID) -> str:
    """Stable care-context id (legacy HIMS: visit + bundle type suffix)."""
    return f"{visit_id}_OPConsultNote"


def trigger_m2_after_end_consultation(
    *,
    tenant_id: UUID,
    patient_id: UUID,
    visit_id: UUID,
) -> None:
    """
    POST integration-hub orchestration (HIP link + add-contexts publish).
    Non-blocking best-effort — failures are logged only.
    """
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
                "hiType": "OPConsultation",
            }
        ],
    }
    payload = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=payload,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "Accept": "application/json",
            "x-tenant-id": str(tenant_id),
            "iq_tenant_id": str(tenant_id),
        },
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
