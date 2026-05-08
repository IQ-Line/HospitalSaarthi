"""Envelope builder and validator tests — mirrors ts-sdk-events envelope behavior."""

from __future__ import annotations

import pytest

from hims_events.envelope import (
    CreateEnvelopeInput,
    EnvelopeValidationError,
    create_envelope,
    validate_envelope,
)
from hims_events.types import DomainEvent

_VALID_UUID = "11111111-2222-3333-4444-555555555555"


def _valid_input(**overrides) -> CreateEnvelopeInput:
    defaults = {
        "event_type": "masterdata.module.registered",
        "source_module": "master-data",
        "iq_tenant_id": _VALID_UUID,
        "correlation_id": _VALID_UUID,
        "actor_id": _VALID_UUID,
        "schema_version": "1.0.0",
        "payload": {"name": "billing"},
    }
    defaults.update(overrides)
    return CreateEnvelopeInput(**defaults)


def test_create_envelope_stamps_event_id_and_timestamp() -> None:
    envelope = create_envelope(_valid_input())
    assert len(envelope.event_id) == 36
    assert envelope.timestamp.endswith("Z")
    assert envelope.event_type == "masterdata.module.registered"
    assert envelope.source_module == "master-data"
    assert envelope.payload == {"name": "billing"}


def test_create_envelope_unique_ids() -> None:
    a = create_envelope(_valid_input())
    b = create_envelope(_valid_input())
    assert a.event_id != b.event_id


def test_validate_envelope_passes_for_valid_event() -> None:
    event = create_envelope(_valid_input())
    validate_envelope(event)


def test_validate_envelope_rejects_bad_event_type() -> None:
    event = DomainEvent(
        event_id=_VALID_UUID,
        event_type="INVALID",
        source_module="master-data",
        iq_tenant_id=_VALID_UUID,
        timestamp="2026-05-08T12:00:00Z",
        correlation_id=_VALID_UUID,
        actor_id=_VALID_UUID,
        schema_version="1.0.0",
        payload={},
    )
    with pytest.raises(EnvelopeValidationError) as exc:
        validate_envelope(event)
    assert "event_type" in exc.value.violations[0]


def test_validate_envelope_collects_multiple_violations() -> None:
    event = DomainEvent(
        event_id="not-a-uuid",
        event_type="INVALID",
        source_module="",
        iq_tenant_id="bad",
        timestamp="nope",
        correlation_id="bad",
        actor_id="bad",
        schema_version="v1",
        payload={},
    )
    with pytest.raises(EnvelopeValidationError) as exc:
        validate_envelope(event)
    assert len(exc.value.violations) >= 7


def test_to_dict_roundtrip() -> None:
    event = create_envelope(_valid_input())
    d = event.to_dict()
    assert d["event_type"] == event.event_type
    assert d["payload"] == event.payload
    rebuilt = DomainEvent(**d)
    assert rebuilt == event
