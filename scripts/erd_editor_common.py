"""Shared helpers for dineug/erd-editor JSON generation."""

from __future__ import annotations

import json
import uuid
from pathlib import Path
from typing import Any

NS = uuid.UUID("6f8e9a2b-4c1d-4e7f-9a3b-010000000000")
TS = 1778800000000

audit = [
    ("created_at", "TIMESTAMPTZ", "Row creation time", True, False, "now()", False),
    ("updated_at", "TIMESTAMPTZ", "Last update time", True, False, "now()", False),
]
audit_actor = [
    ("created_by", "UUID", "Actor from JWT (user_management; no FK)", False, False, "", False),
    ("updated_by", "UUID", "Last modifier (user_management; no FK)", False, False, "", False),
]


def uid(*parts: str) -> str:
    return str(uuid.uuid5(NS, ".".join(parts)))


def meta() -> dict:
    return {"updateAt": TS, "createAt": TS}


def col(
    table_key: str,
    name: str,
    data_type: str,
    comment: str = "",
    default: str = "",
    not_null: bool = False,
    pk: bool = False,
    unique: bool = False,
) -> tuple[str, dict]:
    cid = uid("col", table_key, name)
    options = 6 if pk else (4 if not_null else 0)
    if unique and not pk:
        options |= 2
    return cid, {
        "id": cid,
        "tableId": uid("table", table_key),
        "name": name,
        "comment": comment,
        "dataType": data_type,
        "default": default,
        "options": options,
        "ui": {
            "keys": 3 if pk else 0,
            "widthName": max(60, len(name) * 7),
            "widthComment": min(500, max(60, len(comment) * 6)) if comment else 60,
            "widthDataType": 60,
            "widthDefault": 60 if not default else min(120, len(default) * 7),
        },
        "meta": meta(),
    }


def tenant_col() -> tuple:
    return ("tenant_id", "UUID", "Tenant isolation (Citus distribution key)", True, False, "", False)


def pk_id(comment: str = "Primary key") -> tuple:
    return ("id", "UUID", comment, True, True, "gen_random_uuid()", False)


def _normalize_column(column: tuple) -> tuple:
    """Accept 4-, 6-, or 7-element column shorthand tuples."""
    if len(column) == 7:
        return column
    if len(column) == 6:
        name, dtype, comment, not_null, pk, default = column
        return (name, dtype, comment, not_null, pk, default, False)
    if len(column) == 5:
        name, dtype, comment, not_null, pk = column
        return (name, dtype, comment, not_null, pk, "", False)
    if len(column) == 4:
        name, dtype, comment, not_null = column
        return (name, dtype, comment, not_null, False, "", False)
    raise ValueError(f"Column tuple must have 4, 6, or 7 elements, got {len(column)}: {column}")


def build_erd(
    *,
    out_path: Path,
    database_name: str,
    tables: list[tuple],
    rels: list[tuple],
    memo_text: str,
    canvas_width: int = 9000,
    canvas_height: int = 4800,
) -> None:
    table_entities: dict[str, Any] = {}
    table_column_entities: dict[str, Any] = {}
    table_ids: list[str] = []
    col_by_table: dict[str, dict[str, str]] = {}

    for key, name, comment, x, y, columns, color in tables:
        tid = uid("table", key)
        table_ids.append(tid)
        col_ids: list[str] = []
        col_by_table[key] = {}
        for raw in columns:
            cname, dtype, ccomment, nn, pk, default, unique = _normalize_column(raw)
            cid, cent = col(key, cname, dtype, ccomment, default, nn, pk, unique)
            col_ids.append(cid)
            col_by_table[key][cname] = cid
            table_column_entities[cid] = cent

        table_entities[tid] = {
            "id": tid,
            "name": name,
            "comment": comment,
            "columnIds": col_ids,
            "seqColumnIds": col_ids.copy(),
            "ui": {
                "x": x,
                "y": y,
                "zIndex": 2,
                "widthName": min(max(len(name) * 8, 120), 280),
                "widthComment": 100,
                "color": color,
            },
            "meta": meta(),
        }

    relationship_entities: dict[str, Any] = {}
    relationship_ids: list[str] = []
    for rkey, child, child_col, parent, parent_col, overrides in rels:
        rid = uid("rel", rkey)
        relationship_ids.append(rid)
        relationship_entities[rid] = {
            "id": rid,
            "identification": overrides.get("identification", False),
            "relationshipType": overrides.get("relationshipType", 16),
            "startRelationshipType": overrides.get("startRelationshipType", 1),
            "start": {
                "tableId": uid("table", child),
                "columnIds": [col_by_table[child][child_col]],
                "x": 0,
                "y": 0,
                "direction": 2,
            },
            "end": {
                "tableId": uid("table", parent),
                "columnIds": [col_by_table[parent][parent_col]],
                "x": 0,
                "y": 0,
                "direction": 1,
            },
            "meta": meta(),
        }

    memo_id = uid("memo", out_path.stem)
    doc = {
        "$schema": "https://raw.githubusercontent.com/dineug/erd-editor/main/json-schema/schema.json",
        "version": "3.0.0",
        "settings": {
            "width": canvas_width,
            "height": canvas_height,
            "scrollTop": 1800,
            "scrollLeft": 2000,
            "zoomLevel": 0.5,
            "show": 431,
            "database": 4,
            "databaseName": database_name,
            "canvasType": "ERD",
            "language": 4,
            "tableNameCase": 2,
            "columnNameCase": 2,
            "bracketType": 1,
            "relationshipDataTypeSync": True,
            "relationshipOptimization": False,
            "columnOrder": [1, 2, 4, 8, 16, 32, 64],
            "maxWidthComment": 80,
            "ignoreSaveSettings": 0,
        },
        "doc": {
            "tableIds": table_ids,
            "relationshipIds": relationship_ids,
            "indexIds": [],
            "memoIds": [memo_id],
        },
        "collections": {
            "tableEntities": table_entities,
            "tableColumnEntities": table_column_entities,
            "relationshipEntities": relationship_entities,
            "indexEntities": {},
            "indexColumnEntities": {},
            "memoEntities": {
                memo_id: {
                    "id": memo_id,
                    "value": memo_text,
                    "ui": {
                        "x": canvas_width - 520,
                        "y": 80,
                        "zIndex": 1,
                        "width": 500,
                        "height": 320,
                        "color": "#1e293b",
                    },
                    "meta": meta(),
                }
            },
        },
    }

    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("w", encoding="utf-8") as f:
        json.dump(doc, f, indent=2)
    json.loads(out_path.read_text(encoding="utf-8"))
    print(f"Wrote {out_path} ({len(table_ids)} tables, {len(relationship_ids)} relationships)")
