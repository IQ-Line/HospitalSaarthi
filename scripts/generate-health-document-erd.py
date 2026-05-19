#!/usr/bin/env python3
"""Generate docs/architecture/lld/opd/health_document.erd.json for ERD Editor."""

from __future__ import annotations

from pathlib import Path

from erd_editor_common import audit, audit_actor, build_erd, pk_id, tenant_col

OUT = Path(__file__).resolve().parents[1] / "docs/architecture/lld/opd/health_document.erd.json"

TABLES: list[tuple] = []


def T(key: str, name: str, comment: str, x: int, y: int, columns: list, color: str = "#c8e6c9") -> None:
    TABLES.append((key, name, comment, x, y, columns, color))


# Stubs
T(
    "patients",
    "patients",
    "MASTER/TRANSACTIONAL stub. empi.patients — patient identity anchor.",
    400,
    1600,
    [pk_id(), tenant_col(), ("mrn", "VARCHAR(64)", "Medical record number", False)] + audit,
    "#bbdefb",
)
T(
    "visits",
    "visits",
    "TRANSACTIONAL stub. opd.visits — optional link (Mongo visitId was String).",
    1200,
    1600,
    [pk_id(), tenant_col(), ("patient_id", "UUID", "empi.patients", True), ("status", "TEXT", "Visit status", True)] + audit,
    "#bbdefb",
)

# Aggregate
T(
    "health_documents",
    "health_documents",
    "TRANSACTIONAL. Mongo HealthDocument — uploaded clinical files + ABDM HI metadata.",
    2200,
    1600,
    [
        pk_id(),
        tenant_col(),
        ("patient_id", "UUID", "empi.patients — required", True),
        ("visit_id", "UUID", "opd.visits — optional; normalize Mongo string/ObjectId → UUID", False),
        ("doctor_id", "UUID", "user_management.users — authoring clinician", False),
        ("hi_type", "VARCHAR(64)", "ABDM HI type e.g. ImmunizationRecord, HealthDocumentRecord", True),
        ("document_title", "VARCHAR(512)", "display name / title", True),
        ("original_file_name", "VARCHAR(512)", "uploaded file name", True),
        ("storage_key", "TEXT", "Object storage path or blob key", True),
        ("mime_type", "VARCHAR(128)", "MIME type", True),
        ("file_size_bytes", "BIGINT", "File size", False),
        ("checksum_sha256", "CHAR(64)", "Integrity hash of file bytes", False),
        ("description", "TEXT", "Clinical description", False),
        ("uploaded_at", "TIMESTAMPTZ", "Mongo uploadedAt — business upload time", True, False, "now()"),
        ("uploaded_by", "UUID", "user_management.users", False),
        ("status", "health_document_status", "active | archived | deleted", True, False, "active"),
        ("abdm_care_context_ref", "VARCHAR(128)", "ABDM care-context reference after link", False),
        ("abdm_link_status", "VARCHAR(32)", "not_linked | linkable | linked | revoked", False),
        ("abdm_linked_at", "TIMESTAMPTZ", "When linked to ABHA", False),
        ("record_foundation_care_context_id", "UUID", "record_foundation.care_contexts — optional", False),
        ("deleted_at", "TIMESTAMPTZ", "Soft delete", False),
    ]
    + audit,
    "#a5d6a7",
)

T(
    "health_document_tags",
    "health_document_tags",
    "JUNCTION 1:N. Normalized tags[] from Mongo (composite PK).",
    3200,
    1600,
    [
        ("health_document_id", "UUID", "FK health_documents; PK part", True, True),
        tenant_col(),
        ("tag", "VARCHAR(64)", "Tag label; PK part", True, True),
    ],
)

T(
    "health_document_abdm_link_events",
    "health_document_abdm_link_events",
    "CHILD 1:N audit. ABDM link/discovery lifecycle events per document.",
    2200,
    800,
    [
        pk_id(),
        tenant_col(),
        ("health_document_id", "UUID", "FK health_documents", True),
        ("event_type", "VARCHAR(64)", "e.g. link_requested, linked, revoked", True),
        ("event_at", "TIMESTAMPTZ", "Event timestamp", True, False, "now()"),
        ("actor_id", "UUID", "user or system actor", False),
        ("payload", "JSONB", "Gateway response metadata — rare extensibility", False),
    ],
)

RELS: list[tuple] = [
    ("hd_patient", "health_documents", "patient_id", "patients", "id", {}),
    ("hd_visit", "health_documents", "visit_id", "visits", "id", {}),
    ("tag_hd", "health_document_tags", "health_document_id", "health_documents", "id", {}),
    ("evt_hd", "health_document_abdm_link_events", "health_document_id", "health_documents", "id", {}),
]

MEMO = """=== OPD HealthDocument (MongoDB → PostgreSQL) ===
Schema: opd | 5 tables

PATIENT 1:N HEALTH_DOCUMENTS
VISIT 1:N HEALTH_DOCUMENTS (optional visit_id)
IMMUNISATION FILE: row with hi_type = ImmunizationRecord (NOT prescription_vaccines_required)

Mongo visitId was String — map to UUID via legacy ObjectId lookup table.
Mongo has no createdAt — use uploaded_at + standard created_at/updated_at.

Links record_foundation.care_contexts when ABDM care context is registered."""


def main() -> None:
    build_erd(
        out_path=OUT,
        database_name="opd",
        tables=TABLES,
        rels=RELS,
        memo_text=MEMO,
        canvas_width=5200,
        canvas_height=3200,
    )


if __name__ == "__main__":
    main()
