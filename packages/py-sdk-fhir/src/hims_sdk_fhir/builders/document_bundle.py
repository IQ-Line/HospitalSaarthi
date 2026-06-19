"""``build_document_bundle`` — Layer-1 FHIR Document Bundle builder.

Python mirror of ts ``buildDocumentBundle``. Assigns ``urn:uuid:`` fullUrls,
sets matching ``resource.id``, builds the reference map, and rewrites every
``ResourceType/id`` reference in place so the bundle is self-contained.

@see docs/architecture/adr/0023-distributed-fhir-assembly.md
@see https://hl7.org/fhir/R4/documents.html
"""

from __future__ import annotations

import copy

from ..lib import (
    Clock,
    UuidFactory,
    build_reference_map,
    default_clock,
    default_uuid_factory,
    rewrite_references_in_place,
    to_fhir_datetime,
)
from ..types import Bundle, BundleEntry, Composition, FhirIdentifier, FhirMeta, FhirResource


def build_document_bundle(
    *,
    composition: Composition,
    entries: list[FhirResource],
    uuid_factory: UuidFactory = default_uuid_factory,
    clock: Clock = default_clock,
    identifier: FhirIdentifier | None = None,
    timestamp: str | None = None,
    meta: FhirMeta | None = None,
) -> Bundle:
    """Build a ``type: document`` ``Bundle`` whose first entry is the Composition.

    Mirrors ts ``buildDocumentBundle`` for the default (``meta=None``) call.
    When ``meta`` is given it is stamped onto ``bundle["meta"]`` (the composer
    passes the DocumentBundle profile + confidentiality security label).
    """
    bundle_timestamp = timestamp if timestamp is not None else to_fhir_datetime(clock())
    bundle_id = uuid_factory()
    bundle_identifier: FhirIdentifier = identifier or {
        "system": "http://hip.in",
        "value": f"urn:uuid:{uuid_factory()}",
    }

    composition_copy = copy.deepcopy(composition)
    composition_copy["id"] = uuid_factory()

    entry_resources: list[FhirResource] = [composition_copy]
    entry_resources.extend(copy.deepcopy(resource) for resource in entries)

    full_urls: list[str] = []
    for resource in entry_resources:
        if not resource.get("id"):
            resource["id"] = uuid_factory()
        full_urls.append(f"urn:uuid:{resource['id']}")

    ref_map = build_reference_map(entry_resources, full_urls)
    for resource in entry_resources:
        rewrite_references_in_place(resource, ref_map)

    bundle_entries: list[BundleEntry] = [
        {"fullUrl": full_url, "resource": resource}
        for full_url, resource in zip(full_urls, entry_resources, strict=True)
    ]

    bundle: Bundle = {
        "resourceType": "Bundle",
        "id": bundle_id,
        "identifier": bundle_identifier,
        "type": "document",
        "timestamp": bundle_timestamp,
        "entry": bundle_entries,
    }

    if meta is not None:
        bundle["meta"] = meta

    return bundle
