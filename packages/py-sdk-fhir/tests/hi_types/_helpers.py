"""Shared assertions for the HI-Type composer integration tests."""

from __future__ import annotations

import re
from typing import Any

from hims_sdk_fhir import (
    CONFIDENTIALITY_SECURITY,
    DOCUMENT_BUNDLE_PROFILE,
    DOCUMENT_BUNDLE_PROFILE_VERSION,
)

# A leftover internal reference of the form "ResourceType/id" — these must all
# have been rewritten to "urn:uuid:..." by build_document_bundle.
_TYPE_ID_REF = re.compile(r"^[A-Z][A-Za-z]+/[^/]+$")


def _walk_references(node: Any):
    """Yield every ``{"reference": str}`` value found anywhere in ``node``."""
    if isinstance(node, dict):
        for key, value in node.items():
            if key == "reference" and isinstance(value, str):
                yield value
            else:
                yield from _walk_references(value)
    elif isinstance(node, list):
        for item in node:
            yield from _walk_references(item)


def assert_references_resolve(bundle: dict) -> None:
    """Assert every internal reference in ``bundle`` resolves.

    Collects every entry ``fullUrl``, then walks the whole bundle. Every
    ``urn:uuid:`` reference must resolve to a present entry, and there must be no
    remaining ``ResourceType/id``-style internal references (i.e. all internal
    refs were rewritten). External identifier-style refs are tolerated.
    """
    full_urls = {entry["fullUrl"] for entry in bundle["entry"]}

    # Bundle.signature.who is a reference too, but lives outside entry[].
    nodes_to_walk: list[Any] = [bundle["entry"]]
    if "signature" in bundle:
        nodes_to_walk.append(bundle["signature"])

    for node in nodes_to_walk:
        for ref in _walk_references(node):
            if ref.startswith("urn:uuid:"):
                assert ref in full_urls, f"dangling urn:uuid reference: {ref}"
            else:
                assert not _TYPE_ID_REF.match(ref), f"un-rewritten Type/id reference: {ref}"


def assert_document_bundle_shape(bundle: dict) -> None:
    """Assert the common DocumentBundle envelope invariants."""
    assert bundle["resourceType"] == "Bundle"
    assert bundle["type"] == "document"

    profiles = bundle["meta"]["profile"]
    assert f"{DOCUMENT_BUNDLE_PROFILE}|{DOCUMENT_BUNDLE_PROFILE_VERSION}" in profiles
    assert CONFIDENTIALITY_SECURITY in bundle["meta"]["security"]

    first = bundle["entry"][0]["resource"]
    assert first["resourceType"] == "Composition"


def resource_types(bundle: dict) -> list[str]:
    """Return the list of ``resourceType`` values across all entries."""
    return [entry["resource"]["resourceType"] for entry in bundle["entry"]]


def first_composition(bundle: dict) -> dict:
    """Return the Composition (first entry) resource."""
    return bundle["entry"][0]["resource"]
