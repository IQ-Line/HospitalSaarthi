"""HTTP read tests for platform picklist catalog endpoints, against real Postgres/Citus
via the shared ``pg_client`` (see conftest).
"""

from __future__ import annotations

from uuid import UUID, uuid4

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.picklist import PicklistModel, PicklistValueModel


def _seed_picklist_with_values(session: Session) -> tuple[UUID, UUID]:
    picklist = PicklistModel(
        name="Gender",
        slug="gender",
        is_active=True,
        is_deleted=False,
    )
    session.add(picklist)
    session.flush()
    male = PicklistValueModel(
        category_id=picklist.id,
        value="male",
        label="Male",
        display_order=1,
        is_active=True,
        is_global=False,
    )
    female = PicklistValueModel(
        category_id=picklist.id,
        value="female",
        label="Female",
        display_order=2,
        is_active=True,
        is_global=False,
    )
    session.add_all([male, female])
    session.commit()
    session.refresh(picklist)
    session.refresh(male)
    return picklist.id, male.id


def test_list_picklists_empty(pg_client: TestClient) -> None:
    response = pg_client.get("/api/v1/master-data/picklists")
    assert response.status_code == 200
    body = response.json()
    assert body["data"] == []
    assert body["total"] == 0


def test_list_picklists_and_values(
    pg_client: TestClient, pg_session: Session
) -> None:
    picklist_id, value_id = _seed_picklist_with_values(pg_session)

    listed = pg_client.get("/api/v1/master-data/picklists")
    assert listed.status_code == 200
    assert listed.json()["total"] == 1
    assert listed.json()["data"][0]["slug"] == "gender"
    assert listed.json()["data"][0]["id"] == str(picklist_id)

    values = pg_client.get(f"/api/v1/master-data/picklists/{picklist_id}/values")
    assert values.status_code == 200
    payload = values.json()
    assert payload["total"] == 2
    assert {row["value"] for row in payload["data"]} == {"male", "female"}
    assert payload["data"][0]["category_id"] == str(picklist_id)
    assert any(row["id"] == str(value_id) for row in payload["data"])


def test_list_picklist_values_pagination(
    pg_client: TestClient,
    pg_session: Session,
) -> None:
    picklist_id, _ = _seed_picklist_with_values(pg_session)

    page = pg_client.get(
        f"/api/v1/master-data/picklists/{picklist_id}/values",
        params={"limit": 1, "offset": 0},
    )
    assert page.status_code == 200
    assert page.json()["total"] == 2
    assert len(page.json()["data"]) == 1


def test_list_picklist_values_by_slug(
    pg_client: TestClient,
    pg_session: Session,
) -> None:
    picklist_id, _ = _seed_picklist_with_values(pg_session)

    values = pg_client.get("/api/v1/master-data/picklists/gender/values")
    assert values.status_code == 200
    payload = values.json()
    assert payload["total"] == 2
    assert {row["value"] for row in payload["data"]} == {"male", "female"}
    assert payload["data"][0]["category_id"] == str(picklist_id)


def test_list_picklist_values_unknown_picklist(pg_client: TestClient) -> None:
    response = pg_client.get(f"/api/v1/master-data/picklists/{uuid4()}/values")
    assert response.status_code == 404

    response_slug = pg_client.get("/api/v1/master-data/picklists/unknown-slug/values")
    assert response_slug.status_code == 404
