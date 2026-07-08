"""Full HTTP CRUD against the real ``DepartmentRepository`` on real Postgres/Citus.

Exercises the real partial-unique index (409 on duplicate active code) and the real
not-found paths against the ``master_global`` schema, via the shared ``pg_client``
(see conftest).
"""

from __future__ import annotations

from uuid import UUID

from fastapi.testclient import TestClient

_MISSING_ID = "00000000-0000-4000-8000-0000000000ff"
_DEPARTMENTS = "/api/v1/master-data/departments"


def _create_json(name: str, code: str, **extra: object) -> dict:
    body: dict = {"name": name, "code": code, "type": "clinical", "description": "d"}
    body.update(extra)
    return body


def test_department_crud_lifecycle(pg_client: TestClient, actor_sub: str) -> None:
    r = pg_client.post(_DEPARTMENTS, json=_create_json("Cardiology", "CARD"))
    assert r.status_code == 201, r.text
    body = r.json()["data"]
    assert body["code"] == "card"  # persisted normalized (lowercased) by the real repo
    assert body["created_by"] == actor_sub  # verified token sub, not a header
    did = UUID(body["id"])

    lst = pg_client.get(_DEPARTMENTS)
    assert lst.status_code == 200
    assert lst.json()["total"] == 1  # the real row is actually in the DB

    g = pg_client.get(f"{_DEPARTMENTS}/{did}")
    assert g.status_code == 200
    assert g.json()["data"]["code"] == "card"

    p = pg_client.patch(f"{_DEPARTMENTS}/{did}", json={"name": "Cardiac Sciences"})
    assert p.status_code == 200, p.text
    assert p.json()["data"]["name"] == "Cardiac Sciences"
    assert p.json()["data"]["updated_by"] == actor_sub

    d = pg_client.delete(f"{_DEPARTMENTS}/{did}")
    assert d.status_code in (200, 204), d.text
    # soft-deleted → no longer listed
    assert pg_client.get(_DEPARTMENTS).json()["total"] == 0


def test_duplicate_active_code_conflicts(pg_client: TestClient) -> None:
    first = pg_client.post(_DEPARTMENTS, json=_create_json("Cardiology", "CARD"))
    assert first.status_code == 201, first.text
    dup = pg_client.post(_DEPARTMENTS, json=_create_json("Cardio Two", "CARD"))
    assert dup.status_code == 409, dup.text  # real partial-unique index fires


def test_list_search_matches_name_code_type_and_description(pg_client: TestClient) -> None:
    # Distinct rows so each search term isolates exactly one department. The term
    # that only appears in `description` proves description is searchable (issue #128).
    assert (
        pg_client.post(
            _DEPARTMENTS,
            json=_create_json("Cardiology", "CARD", type="clinical", description="heart care"),
        ).status_code
        == 201
    )
    assert (
        pg_client.post(
            _DEPARTMENTS,
            json=_create_json("Radiology", "RADX", type="diagnostic", description="imaging suite"),
        ).status_code
        == 201
    )
    # A row with NULL description must not break the search OR (ilike NULL -> no match).
    assert (
        pg_client.post(
            _DEPARTMENTS,
            json={"name": "Housekeeping", "code": "HKPG", "type": "support"},
        ).status_code
        == 201
    )

    def codes_for(term: str) -> set[str]:
        r = pg_client.get(_DEPARTMENTS, params={"search": term})
        assert r.status_code == 200, r.text
        return {row["code"] for row in r.json()["data"]}

    assert codes_for("Cardio") == {"card"}  # name
    assert codes_for("RADX") == {"radx"}  # code
    assert codes_for("diagnostic") == {"radx"}  # type
    assert codes_for("imaging") == {"radx"}  # description-only match
    assert codes_for("care") == {"card"}  # description-only match
    # A term present in no searchable column returns nothing (the NULL-description
    # row is still reachable via its other columns).
    assert codes_for("nonexistent-token") == set()
    assert codes_for("HKPG") == {"hkpg"}


def test_get_missing_department_404(pg_client: TestClient) -> None:
    assert pg_client.get(f"{_DEPARTMENTS}/{_MISSING_ID}").status_code == 404


def test_delete_missing_department_404(pg_client: TestClient) -> None:
    assert pg_client.delete(f"{_DEPARTMENTS}/{_MISSING_ID}").status_code == 404
