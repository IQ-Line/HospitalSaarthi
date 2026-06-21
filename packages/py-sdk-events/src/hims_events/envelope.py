"""Envelope builder and validator — mirrors @hims/ts-sdk-events/envelope.ts."""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

from hims_events.types import DomainEvent

UUID_RE = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", re.I)
EVENT_TYPE_RE = re.compile(r"^[a-z]+\.[a-z][a-z0-9-]*\.[a-z][a-z0-9-]*$")
SEMVER_RE = re.compile(r"^\d+\.\d+\.\d+$")
ISO_DATE_RE = re.compile(
    r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$"
)


@dataclass(frozen=True, slots=True)
class CreateEnvelopeInput:
    event_type: str
    source_module: str
    iq_tenant_id: str
    correlation_id: str
    actor_id: str
    schema_version: str
    payload: dict[str, Any]


def create_envelope(inp: CreateEnvelopeInput) -> DomainEvent:
    return DomainEvent(
        event_id=str(uuid4()),
        timestamp=datetime.now(UTC).isoformat().replace("+00:00", "Z"),
        event_type=inp.event_type,
        source_module=inp.source_module,
        iq_tenant_id=inp.iq_tenant_id,
        correlation_id=inp.correlation_id,
        actor_id=inp.actor_id,
        schema_version=inp.schema_version,
        payload=inp.payload,
    )


class EnvelopeValidationError(Exception):
    def __init__(self, violations: list[str]) -> None:
        self.violations = violations
        super().__init__(f"Invalid event envelope: {'; '.join(violations)}")


def validate_envelope(event: DomainEvent) -> None:
    violations: list[str] = []

    if not isinstance(event.event_id, str) or not UUID_RE.match(event.event_id):
        violations.append("event_id must be a valid UUID")
    if not isinstance(event.event_type, str) or not EVENT_TYPE_RE.match(event.event_type):
        violations.append("event_type must match <module>.<entity>.<action> pattern")
    if not isinstance(event.source_module, str) or len(event.source_module) == 0:
        violations.append("source_module is required")
    if not isinstance(event.iq_tenant_id, str) or not UUID_RE.match(event.iq_tenant_id):
        violations.append("iq_tenant_id must be a valid UUID")
    if not isinstance(event.timestamp, str) or not ISO_DATE_RE.match(event.timestamp):
        violations.append("timestamp must be ISO-8601")
    if not isinstance(event.correlation_id, str) or not UUID_RE.match(event.correlation_id):
        violations.append("correlation_id must be a valid UUID")
    if not isinstance(event.actor_id, str) or not UUID_RE.match(event.actor_id):
        violations.append("actor_id must be a valid UUID")
    if not isinstance(event.schema_version, str) or not SEMVER_RE.match(event.schema_version):
        violations.append("schema_version must be semver (e.g. 1.0.0)")
    if not isinstance(event.payload, dict):
        violations.append("payload must be a dict")

    if violations:
        raise EnvelopeValidationError(violations)
