"""Publisher implementation tests."""

from __future__ import annotations

import asyncio

import pytest

from hims_events.envelope import CreateEnvelopeInput, EnvelopeValidationError, create_envelope
from hims_events.publisher import InProcessEventPublisher, NoOpEventPublisher
from hims_events.types import DomainEvent

_VALID_UUID = "11111111-2222-3333-4444-555555555555"


def _event(**overrides) -> DomainEvent:
    inp = CreateEnvelopeInput(
        event_type=overrides.pop("event_type", "masterdata.module.registered"),
        source_module="master-data",
        iq_tenant_id=_VALID_UUID,
        correlation_id=_VALID_UUID,
        actor_id=_VALID_UUID,
        schema_version="1.0.0",
        payload=overrides.pop("payload", {"name": "billing"}),
    )
    return create_envelope(inp)


class TestInProcessEventPublisher:
    def test_publish_fans_out_to_subscribers(self) -> None:
        bus = InProcessEventPublisher()
        received: list[DomainEvent] = []

        async def handler(event: DomainEvent) -> None:
            received.append(event)

        async def run() -> None:
            await bus.subscribe("masterdata.module.registered", handler)
            await bus.publish(_event())

        asyncio.run(run())
        assert len(received) == 1
        assert received[0].event_type == "masterdata.module.registered"

    def test_publish_ignores_unsubscribed_types(self) -> None:
        bus = InProcessEventPublisher()
        received: list[DomainEvent] = []

        async def handler(event: DomainEvent) -> None:
            received.append(event)

        async def run() -> None:
            await bus.subscribe("other.event.type", handler)
            await bus.publish(_event())

        asyncio.run(run())
        assert len(received) == 0

    def test_unsubscribe_stops_delivery(self) -> None:
        bus = InProcessEventPublisher()
        received: list[DomainEvent] = []

        async def handler(event: DomainEvent) -> None:
            received.append(event)

        async def run() -> None:
            sub = await bus.subscribe("masterdata.module.registered", handler)
            await bus.publish(_event())
            await sub.unsubscribe()
            await bus.publish(_event())

        asyncio.run(run())
        assert len(received) == 1

    def test_handler_failure_does_not_break_other_handlers(self) -> None:
        bus = InProcessEventPublisher()
        received: list[str] = []

        async def failing_handler(event: DomainEvent) -> None:
            raise RuntimeError("boom")

        async def ok_handler(event: DomainEvent) -> None:
            received.append("ok")

        async def run() -> None:
            await bus.subscribe("masterdata.module.registered", failing_handler)
            await bus.subscribe("masterdata.module.registered", ok_handler)
            await bus.publish(_event())

        asyncio.run(run())
        assert "ok" in received

    def test_validation_rejects_bad_envelope(self) -> None:
        bus = InProcessEventPublisher(validate=True)
        bad = DomainEvent(
            event_id="not-uuid",
            event_type="BAD",
            source_module="",
            iq_tenant_id="bad",
            timestamp="nope",
            correlation_id="bad",
            actor_id="bad",
            schema_version="v1",
            payload={},
        )

        with pytest.raises(EnvelopeValidationError):
            asyncio.run(bus.publish(bad))

    def test_disconnect_clears_subscribers(self) -> None:
        bus = InProcessEventPublisher()
        received: list[DomainEvent] = []

        async def handler(event: DomainEvent) -> None:
            received.append(event)

        async def run() -> None:
            await bus.subscribe("masterdata.module.registered", handler)
            await bus.disconnect()
            await bus.publish(_event())

        asyncio.run(run())
        assert len(received) == 0


class TestNoOpEventPublisher:
    def test_publish_does_nothing(self) -> None:
        bus = NoOpEventPublisher()
        asyncio.run(bus.publish(_event()))

    def test_subscribe_returns_subscription(self) -> None:
        bus = NoOpEventPublisher()

        async def handler(event: DomainEvent) -> None:
            pass

        async def run() -> None:
            sub = await bus.subscribe("any.event.type", handler)
            await sub.unsubscribe()

        asyncio.run(run())
