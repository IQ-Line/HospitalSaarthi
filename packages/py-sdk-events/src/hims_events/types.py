"""Domain event types — mirrors @hims/ts-sdk-events/types.ts."""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field
from typing import Any


@dataclass(frozen=True, slots=True)
class DomainEvent:
    event_id: str
    event_type: str
    source_module: str
    iq_tenant_id: str
    timestamp: str
    correlation_id: str
    actor_id: str
    schema_version: str
    payload: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "event_id": self.event_id,
            "event_type": self.event_type,
            "source_module": self.source_module,
            "iq_tenant_id": self.iq_tenant_id,
            "timestamp": self.timestamp,
            "correlation_id": self.correlation_id,
            "actor_id": self.actor_id,
            "schema_version": self.schema_version,
            "payload": self.payload,
        }


EventHandler = Callable[[DomainEvent], Awaitable[None]]


@dataclass
class Subscription:
    unsubscribe: Callable[[], Awaitable[None]]
