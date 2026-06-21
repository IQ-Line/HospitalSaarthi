"""Event publisher implementations — mirrors @hims/ts-sdk-events/event-bus.interface.ts.

Three implementations for different environments:

- ``InProcessEventPublisher``: in-memory fan-out (TS equivalent: InProcessEventBus)
- ``HttpEventPublisher``: POST envelopes to consumer URLs (cross-process bridge)
- ``NoOpEventPublisher``: silent discard for tests and standalone dev
"""

from __future__ import annotations

import asyncio
import logging
from typing import Protocol, runtime_checkable

import httpx

from hims_events.envelope import validate_envelope
from hims_events.types import DomainEvent, EventHandler, Subscription

logger = logging.getLogger("hims_events")


@runtime_checkable
class EventPublisher(Protocol):
    async def connect(self) -> None: ...
    async def disconnect(self) -> None: ...
    async def publish(self, event: DomainEvent) -> None: ...
    async def subscribe(self, event_type: str, handler: EventHandler) -> Subscription: ...


class InProcessEventPublisher:
    """In-memory pub/sub — mirrors InProcessEventBus from ts-sdk-events."""

    def __init__(self, *, validate: bool = True) -> None:
        self._subscribers: dict[str, set[EventHandler]] = {}
        self._validate = validate

    async def connect(self) -> None:
        pass

    async def disconnect(self) -> None:
        self._subscribers.clear()

    async def publish(self, event: DomainEvent) -> None:
        if self._validate:
            validate_envelope(event)

        handlers = self._subscribers.get(event.event_type)
        if not handlers:
            return

        results = await asyncio.gather(
            *(h(event) for h in handlers),
            return_exceptions=True,
        )
        for result in results:
            if isinstance(result, BaseException):
                logger.error(
                    "Handler failed for %s: %s",
                    event.event_type,
                    result,
                )

    async def subscribe(self, event_type: str, handler: EventHandler) -> Subscription:
        if event_type not in self._subscribers:
            self._subscribers[event_type] = set()
        self._subscribers[event_type].add(handler)

        async def _unsub() -> None:
            self._subscribers.get(event_type, set()).discard(handler)

        return Subscription(unsubscribe=_unsub)


class HttpEventPublisher:
    """POST event envelopes to known consumer URLs (Phase 0 cross-process bridge)."""

    def __init__(
        self,
        targets: list[str],
        *,
        validate: bool = True,
        timeout: float = 5.0,
    ) -> None:
        self._targets = targets
        self._validate = validate
        self._timeout = timeout
        self._client: httpx.AsyncClient | None = None

    async def connect(self) -> None:
        self._client = httpx.AsyncClient(timeout=self._timeout)

    async def disconnect(self) -> None:
        if self._client:
            await self._client.aclose()
            self._client = None

    async def publish(self, event: DomainEvent) -> None:
        if self._validate:
            validate_envelope(event)

        client = self._client or httpx.AsyncClient(timeout=self._timeout)
        try:
            for url in self._targets:
                try:
                    await client.post(url, json=event.to_dict())
                except httpx.HTTPError:
                    logger.warning(
                        "Failed to deliver event %s to %s",
                        event.event_type,
                        url,
                    )
        finally:
            if not self._client:
                await client.aclose()

    async def subscribe(self, event_type: str, handler: EventHandler) -> Subscription:
        raise NotImplementedError(
            "HttpEventPublisher is send-only. "
            "Use InProcessEventPublisher on the receiving side."
        )


class NoOpEventPublisher:
    """Discards all events. Use in tests or standalone dev with no consumers."""

    async def connect(self) -> None:
        pass

    async def disconnect(self) -> None:
        pass

    async def publish(self, event: DomainEvent) -> None:
        pass

    async def subscribe(self, event_type: str, handler: EventHandler) -> Subscription:
        async def _noop() -> None:
            pass

        return Subscription(unsubscribe=_noop)
