"""Repository interfaces (Protocol classes).

Use-cases depend on these protocols, never on concrete data-access classes.
Service wrappers inject concrete implementations from ``opd.data_access``.
"""

from typing import Protocol


class OpdPort(Protocol):
    """Placeholder. Replace with real repository protocols as domain emerges."""

    ...
