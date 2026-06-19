"""``compact`` — recursively prune empty/None values from FHIR structures.

"Omit, don't null" (ADR-0023 discipline): optional fields absent from input
must be omitted from output rather than emitted as ``null`` or empty containers.

Semantics (returns a NEW structure; never mutates the input):

- ``dict``: each value is compacted; a key is dropped when its compacted value
  is ``None`` or an empty ``list``/``dict``. Empty strings are KEPT (a key whose
  value is ``""`` is meaningful) — only ``None`` removes a key.
- ``list``: each item is compacted; the list is kept (even if it becomes empty).
  Empty lists at the *top level of a dict value* are then dropped by the dict
  rule above, which is what removes empty FHIR arrays.
- Falsy scalars ``0`` / ``0.0`` / ``False`` / ``""`` are preserved — they carry
  meaning in FHIR (e.g. ``valueQuantity.value == 0``).

@see docs/architecture/adr/0023-distributed-fhir-assembly.md
"""

from __future__ import annotations

from typing import Any


def _is_empty_container(value: Any) -> bool:
    return isinstance(value, (list, dict)) and len(value) == 0


def compact(value: Any) -> Any:
    """Recursively remove ``None`` and empty ``list``/``dict`` values.

    Returns a new structure; the input is left untouched. Falsy scalars
    (``0``, ``False``, ``0.0``, ``""``) are preserved.
    """
    if isinstance(value, dict):
        result: dict[Any, Any] = {}
        for key, raw in value.items():
            compacted = compact(raw)
            if compacted is None or _is_empty_container(compacted):
                continue
            result[key] = compacted
        return result
    if isinstance(value, list):
        return [compact(item) for item in value]
    return value
