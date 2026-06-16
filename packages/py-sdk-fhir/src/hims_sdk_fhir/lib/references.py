"""Reference rewriting — ``ResourceType/id`` → ``urn:uuid:…``.

Python mirror of ``packages/ts-sdk-fhir/src/lib/reference-rewrite.ts``. Builds a
map from local ``Type/id`` references to the ``urn:uuid:`` fullUrls assigned by
the bundle builder, then rewrites every matching ``reference`` string in place
(ADR-0023 self-contained bundle).

@see docs/architecture/adr/0023-distributed-fhir-assembly.md
"""

from __future__ import annotations

from typing import Any


def build_reference_map(resources: list[dict], full_urls: list[str]) -> dict[str, str]:
    """Map ``f"{resourceType}/{id}"`` -> fullUrl for ``urn:uuid:`` fullUrls.

    A resource contributes an entry only when it declares both an ``id`` and a
    ``resourceType``, and its paired fullUrl starts with ``urn:uuid:``.
    """
    ref_map: dict[str, str] = {}
    for resource, full_url in zip(resources, full_urls, strict=False):
        if not isinstance(resource, dict):
            continue
        resource_id = resource.get("id")
        resource_type = resource.get("resourceType")
        if not resource_id or not resource_type:
            continue
        if not (isinstance(full_url, str) and full_url.startswith("urn:uuid:")):
            continue
        ref_map[f"{resource_type}/{resource_id}"] = full_url
    return ref_map


def rewrite_references_in_place(value: Any, ref_map: dict[str, str]) -> None:
    """Recursively rewrite ``{"reference": "Type/id"}`` strings found in ``ref_map``.

    Walks dicts and lists in place; unknown references are left untouched.
    """
    if value is None:
        return
    if isinstance(value, list):
        for item in value:
            rewrite_references_in_place(item, ref_map)
        return
    if not isinstance(value, dict):
        return

    reference = value.get("reference")
    if isinstance(reference, str):
        mapped = ref_map.get(reference)
        if mapped is not None:
            value["reference"] = mapped

    for child in value.values():
        rewrite_references_in_place(child, ref_map)
