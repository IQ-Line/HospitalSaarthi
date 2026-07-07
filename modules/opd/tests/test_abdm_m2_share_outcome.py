"""Loud-failure + visible-status guarantees for the opd->integration-hub M2 publish.

The M2 share is a downstream side effect of an already-committed OPD encounter (it runs
as a FastAPI background task). These tests pin three ratified guarantees:

  1. A FAILED publish is LOUD -- logged at ERROR with enough context to reconcile the
     missed share -- and NEVER raises into the (already-committed) clinical path.
  2. The share OUTCOME is caller-visible: ``trigger_m2_after_end_consultation`` returns
     an ``M2ShareResult`` that distinguishes skipped / succeeded / failed+reason.
  3. The happy path (a successful share) is behavior-preserving: no ERROR is logged.

Mutation proof: delete the ``logger.error`` in ``_log_m2_share_failure`` (or make the
failure path return SUCCEEDED) and ``test_failed_publish_is_loud_and_non_fatal`` /
``test_http_4xx_from_hub_is_failed_and_loud`` fail.
"""

from __future__ import annotations

import logging
import urllib.error
from unittest.mock import MagicMock, patch
from uuid import uuid4

from opd.integrations.abdm_m2 import (
    HI_TYPE_OP_CONSULT,
    HI_TYPE_PRESCRIPTION,
    M2ShareResult,
    M2ShareStatus,
    op_consult_care_context_ref,
    prescription_care_context_ref,
    trigger_m2_after_end_consultation,
)

LOGGER_NAME = "opd.integrations.abdm_m2"


def _contexts(visit_id):
    return [
        {
            "referenceNumber": op_consult_care_context_ref(visit_id),
            "display": "OP consult",
            "hiType": HI_TYPE_OP_CONSULT,
        },
        {
            "referenceNumber": prescription_care_context_ref(visit_id),
            "display": "Prescription",
            "hiType": HI_TYPE_PRESCRIPTION,
        },
    ]


def _error_records(caplog) -> list[logging.LogRecord]:
    return [r for r in caplog.records if r.name == LOGGER_NAME and r.levelno >= logging.ERROR]


@patch("opd.integrations.abdm_m2.persist_visit_abdm_bundles")
@patch("opd.integrations.abdm_m2._integration_hub_base_url")
@patch("opd.integrations.abdm_m2.get_settings")
@patch("opd.integrations.abdm_m2.urllib.request.urlopen")
def test_failed_publish_is_loud_and_non_fatal(
    mock_urlopen,
    mock_settings,
    mock_hub_base,
    mock_persist,
    caplog,
) -> None:
    visit_id, tenant_id, patient_id = uuid4(), uuid4(), uuid4()
    mock_settings.return_value.abdm_m2_enabled = True
    mock_hub_base.return_value = "http://hub.test"
    mock_persist.return_value = _contexts(visit_id)

    # The hub is unreachable: the fire-and-forget POST raises inside urlopen.
    mock_urlopen.side_effect = urllib.error.URLError("connection refused")

    with caplog.at_level(logging.ERROR, logger=LOGGER_NAME):
        # NON-FATAL: this must not raise into the (already-committed) clinical path.
        result = trigger_m2_after_end_consultation(
            tenant_id=tenant_id,
            patient_id=patient_id,
            visit_id=visit_id,
        )

    # VISIBLE STATUS: the caller sees a failed share, not a void.
    assert isinstance(result, M2ShareResult)
    assert result.status is M2ShareStatus.FAILED
    assert result.attempted is True
    assert result.care_context_count == 2
    assert result.reason and "unreachable" in result.reason

    # LOUD: exactly one ERROR carrying the reconciliation context.
    errors = _error_records(caplog)
    assert len(errors) == 1
    msg = errors[0].getMessage()
    assert "M2 share FAILED" in msg
    assert str(tenant_id) in msg
    assert str(visit_id) in msg
    assert str(patient_id) in msg
    assert op_consult_care_context_ref(visit_id) in msg


@patch("opd.integrations.abdm_m2.persist_visit_abdm_bundles")
@patch("opd.integrations.abdm_m2._integration_hub_base_url")
@patch("opd.integrations.abdm_m2.get_settings")
@patch("opd.integrations.abdm_m2.urllib.request.urlopen")
def test_http_4xx_from_hub_is_failed_and_loud(
    mock_urlopen,
    mock_settings,
    mock_hub_base,
    mock_persist,
    caplog,
) -> None:
    visit_id, tenant_id, patient_id = uuid4(), uuid4(), uuid4()
    mock_settings.return_value.abdm_m2_enabled = True
    mock_hub_base.return_value = "http://hub.test"
    mock_persist.return_value = _contexts(visit_id)

    # Mock transport that returns a 4xx without raising (defensive parity branch).
    mock_response = MagicMock()
    mock_response.status = 422
    mock_response.__enter__.return_value = mock_response
    mock_response.__exit__.return_value = None
    mock_urlopen.return_value = mock_response

    with caplog.at_level(logging.ERROR, logger=LOGGER_NAME):
        result = trigger_m2_after_end_consultation(
            tenant_id=tenant_id,
            patient_id=patient_id,
            visit_id=visit_id,
        )

    assert result.status is M2ShareStatus.FAILED
    assert result.reason and "422" in result.reason
    errors = _error_records(caplog)
    assert len(errors) == 1
    assert "M2 share FAILED" in errors[0].getMessage()


@patch("opd.integrations.abdm_m2.persist_visit_abdm_bundles")
@patch("opd.integrations.abdm_m2._integration_hub_base_url")
@patch("opd.integrations.abdm_m2.get_settings")
@patch("opd.integrations.abdm_m2.urllib.request.urlopen")
def test_successful_publish_is_quiet_and_succeeded(
    mock_urlopen,
    mock_settings,
    mock_hub_base,
    mock_persist,
    caplog,
) -> None:
    """Happy path is behavior-preserving: SUCCEEDED, one POST, and NO ERROR logged."""
    visit_id, tenant_id, patient_id = uuid4(), uuid4(), uuid4()
    mock_settings.return_value.abdm_m2_enabled = True
    mock_hub_base.return_value = "http://hub.test"
    mock_persist.return_value = _contexts(visit_id)

    mock_response = MagicMock()
    mock_response.status = 200
    mock_response.__enter__.return_value = mock_response
    mock_response.__exit__.return_value = None
    mock_urlopen.return_value = mock_response

    with caplog.at_level(logging.ERROR, logger=LOGGER_NAME):
        result = trigger_m2_after_end_consultation(
            tenant_id=tenant_id,
            patient_id=patient_id,
            visit_id=visit_id,
        )

    assert result.status is M2ShareStatus.SUCCEEDED
    assert result.reason is None
    assert result.care_context_count == 2
    mock_urlopen.assert_called_once()
    assert _error_records(caplog) == []


@patch("opd.integrations.abdm_m2.persist_visit_abdm_bundles")
@patch("opd.integrations.abdm_m2._integration_hub_base_url")
@patch("opd.integrations.abdm_m2.get_settings")
@patch("opd.integrations.abdm_m2.urllib.request.urlopen")
def test_disabled_is_skipped_and_quiet(
    mock_urlopen,
    mock_settings,
    mock_hub_base,
    mock_persist,
    caplog,
) -> None:
    visit_id, tenant_id, patient_id = uuid4(), uuid4(), uuid4()
    mock_settings.return_value.abdm_m2_enabled = False
    mock_hub_base.return_value = "http://hub.test"
    mock_persist.return_value = _contexts(visit_id)

    with caplog.at_level(logging.ERROR, logger=LOGGER_NAME):
        result = trigger_m2_after_end_consultation(
            tenant_id=tenant_id,
            patient_id=patient_id,
            visit_id=visit_id,
        )

    assert result.status is M2ShareStatus.SKIPPED
    assert result.attempted is False
    mock_urlopen.assert_not_called()
    assert _error_records(caplog) == []


@patch("opd.integrations.abdm_m2.persist_visit_abdm_bundles")
@patch("opd.integrations.abdm_m2._integration_hub_base_url")
@patch("opd.integrations.abdm_m2.get_settings")
@patch("opd.integrations.abdm_m2.urllib.request.urlopen")
def test_missing_hub_url_is_skipped_not_attempted(
    mock_urlopen,
    mock_settings,
    mock_hub_base,
    mock_persist,
    caplog,
) -> None:
    """No configured hub -> not an attempted-and-failed share; skipped, no ERROR spam."""
    visit_id, tenant_id, patient_id = uuid4(), uuid4(), uuid4()
    mock_settings.return_value.abdm_m2_enabled = True
    mock_hub_base.return_value = None
    mock_persist.return_value = _contexts(visit_id)

    with caplog.at_level(logging.ERROR, logger=LOGGER_NAME):
        result = trigger_m2_after_end_consultation(
            tenant_id=tenant_id,
            patient_id=patient_id,
            visit_id=visit_id,
        )

    assert result.status is M2ShareStatus.SKIPPED
    assert result.reason and "not configured" in result.reason
    mock_urlopen.assert_not_called()
    assert _error_records(caplog) == []
