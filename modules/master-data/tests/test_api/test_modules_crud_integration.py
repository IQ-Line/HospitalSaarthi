"""Full HTTP CRUD against real ``ModuleRepository`` + in-memory SQLite (FK + partial uniques)."""

from __future__ import annotations

from collections.abc import Generator, Iterator
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps import get_module_repository, get_session
from app.core.catalog_scope import CatalogScope
from app.main import create_app
from app.models import Base
from app.repositories.module_repository import ModuleRepository


@pytest.fixture()
def module_sqlite_session() -> Iterator[Session]:
    # StaticPool: one DB connection shared by test thread and TestClient worker thread.
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    @event.listens_for(engine, "connect")
    def _sqlite_fk(dbapi_connection, _connection_record) -> None:
        dbapi_connection.execute("PRAGMA foreign_keys=ON")
        dbapi_connection.execute("ATTACH DATABASE ':memory:' AS tenant_master")
        dbapi_connection.execute("ATTACH DATABASE ':memory:' AS global_master")

    with engine.begin() as conn:
        Base.metadata.create_all(bind=conn)
    factory = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    session = factory()
    try:
        yield session
    finally:
        session.close()
        # In-memory DB: dispose connection instead of DROP (self-FK blocks DROP on SQLite).
        engine.dispose()


@pytest.fixture()
def module_client(module_sqlite_session: Session) -> Iterator[TestClient]:
    app = create_app()

    def _session() -> Generator[Session, None, None]:
        yield module_sqlite_session

    def _repo() -> ModuleRepository:
        return ModuleRepository(module_sqlite_session, CatalogScope(iq_tenant_id=None))

    app.dependency_overrides[get_session] = _session
    app.dependency_overrides[get_module_repository] = _repo
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()


def _create_json(name: str, slug: str, **extra: object) -> dict:
    body: dict = {
        "name": name,
        "slug": slug,
        "category": "clinical",
        "version": "1.0.0",
    }
    body.update(extra)
    return body


def test_module_crud_lifecycle_and_slug_reuse_after_soft_delete(module_client: TestClient) -> None:
    r = module_client.post("/api/v1/master-data/modules", json=_create_json("billing", "billing"))
    assert r.status_code == 201
    mid = UUID(r.json()["data"]["id"])

    g = module_client.get(f"/api/v1/master-data/modules/{mid}")
    assert g.status_code == 200
    assert g.json()["data"]["slug"] == "billing"
    assert g.json()["data"]["is_deleted"] is False

    gs = module_client.get("/api/v1/master-data/modules/by-slug/billing")
    assert gs.status_code == 200

    lst = module_client.get("/api/v1/master-data/modules")
    assert lst.status_code == 200
    assert lst.json()["total"] == 1

    p = module_client.patch(
        f"/api/v1/master-data/modules/{mid}",
        json={"name": "billing_svc", "version": "1.1.0"},
    )
    assert p.status_code == 200
    assert p.json()["data"]["name"] == "billing_svc"

    d = module_client.delete(f"/api/v1/master-data/modules/{mid}")
    assert d.status_code == 200
    assert d.json()["data"]["is_deleted"] is True

    g404 = module_client.get(f"/api/v1/master-data/modules/{mid}")
    assert g404.status_code == 404

    gslug404 = module_client.get("/api/v1/master-data/modules/by-slug/billing")
    assert gslug404.status_code == 404

    # Same slug allowed again after soft-delete (partial unique on active rows only).
    r2 = module_client.post(
        "/api/v1/master-data/modules",
        json=_create_json("billing_new", "billing"),
    )
    assert r2.status_code == 201
    assert r2.json()["data"]["slug"] == "billing"


def test_post_duplicate_active_slug_conflict(module_client: TestClient) -> None:
    a = module_client.post("/api/v1/master-data/modules", json=_create_json("m1", "shared-slug"))
    assert a.status_code == 201
    b = module_client.post("/api/v1/master-data/modules", json=_create_json("m2", "shared-slug"))
    assert b.status_code == 409
    assert b.json()["error"]["code"] == "CONFLICT"


def test_patch_duplicate_name_conflict(module_client: TestClient) -> None:
    ra = module_client.post(
        "/api/v1/master-data/modules",
        json=_create_json("alpha", "alpha-slug"),
    )
    assert ra.status_code == 201
    rb = module_client.post(
        "/api/v1/master-data/modules",
        json=_create_json("beta", "beta-slug"),
    )
    assert rb.status_code == 201
    id_b = UUID(rb.json()["data"]["id"])
    conflict = module_client.patch(
        f"/api/v1/master-data/modules/{id_b}",
        json={"name": "alpha"},
    )
    assert conflict.status_code == 409


def test_post_invalid_parent_returns_400(module_client: TestClient) -> None:
    missing = uuid4()
    r = module_client.post(
        "/api/v1/master-data/modules",
        json=_create_json("orphan", "orphan-slug", parent_id=str(missing)),
    )
    assert r.status_code == 400
    assert r.json()["error"]["code"] == "BAD_REQUEST"


def test_patch_cycle_returns_400(module_client: TestClient) -> None:
    pa = module_client.post(
        "/api/v1/master-data/modules",
        json=_create_json("a", "a-slug"),
    )
    assert pa.status_code == 201
    id_a = UUID(pa.json()["data"]["id"])
    pb = module_client.post(
        "/api/v1/master-data/modules",
        json=_create_json("b", "b-slug", parent_id=str(id_a)),
    )
    assert pb.status_code == 201
    id_b = UUID(pb.json()["data"]["id"])
    pc = module_client.post(
        "/api/v1/master-data/modules",
        json=_create_json("c", "c-slug", parent_id=str(id_b)),
    )
    assert pc.status_code == 201
    id_c = UUID(pc.json()["data"]["id"])
    # Would make A a descendant of C while C is under A.
    cycle = module_client.patch(
        f"/api/v1/master-data/modules/{id_a}",
        json={"parent_id": str(id_c)},
    )
    assert cycle.status_code == 400
    assert cycle.json()["error"]["code"] == "BAD_REQUEST"


def test_get_submodules_direct_only(module_client: TestClient) -> None:
    root = module_client.post(
        "/api/v1/master-data/modules",
        json=_create_json("r", "ch-root"),
    )
    assert root.status_code == 201
    rid = root.json()["data"]["id"]
    c1 = module_client.post(
        "/api/v1/master-data/modules",
        json=_create_json("c1", "ch-c1", parent_id=rid),
    )
    c2 = module_client.post(
        "/api/v1/master-data/modules",
        json=_create_json("c2", "ch-c2", parent_id=rid),
    )
    assert c1.status_code == 201
    assert c2.status_code == 201
    sub = module_client.post(
        "/api/v1/master-data/modules",
        json=_create_json("sub1", "ch-sub1", parent_id=c1.json()["data"]["id"]),
    )
    assert sub.status_code == 201

    kids = module_client.get(f"/api/v1/master-data/modules/{rid}/submodules")
    assert kids.status_code == 200
    body = kids.json()
    assert body["total"] == 2
    slugs = {row["slug"] for row in body["data"]}
    assert slugs == {"ch-c1", "ch-c2"}


def test_delete_parent_cascades_soft_delete_to_descendants(module_client: TestClient) -> None:
    root = module_client.post(
        "/api/v1/master-data/modules",
        json=_create_json("cascade-r", "cascade-root"),
    )
    assert root.status_code == 201
    rid = root.json()["data"]["id"]
    child = module_client.post(
        "/api/v1/master-data/modules",
        json=_create_json("cascade-c", "cascade-child", parent_id=rid),
    )
    assert child.status_code == 201
    cid = child.json()["data"]["id"]
    grand = module_client.post(
        "/api/v1/master-data/modules",
        json=_create_json("cascade-g", "cascade-grand", parent_id=cid),
    )
    assert grand.status_code == 201
    gid = grand.json()["data"]["id"]

    d = module_client.delete(f"/api/v1/master-data/modules/{rid}")
    assert d.status_code == 200
    assert d.json()["data"]["is_deleted"] is True

    # Descendants are soft-deleted too; detail and list endpoints hide them.
    assert module_client.get(f"/api/v1/master-data/modules/{cid}").status_code == 404
    assert module_client.get(f"/api/v1/master-data/modules/{gid}").status_code == 404
    listed = module_client.get("/api/v1/master-data/modules")
    assert listed.status_code == 200
    slugs = {row["slug"] for row in listed.json()["data"]}
    assert "cascade-child" not in slugs
    assert "cascade-grand" not in slugs


def test_get_submodules_empty_and_404(module_client: TestClient) -> None:
    leaf = module_client.post(
        "/api/v1/master-data/modules",
        json=_create_json("solo", "ch-solo"),
    )
    assert leaf.status_code == 201
    lid = leaf.json()["data"]["id"]
    empty = module_client.get(f"/api/v1/master-data/modules/{lid}/submodules")
    assert empty.status_code == 200
    assert empty.json()["total"] == 0

    missing = module_client.get(f"/api/v1/master-data/modules/{uuid4()}/submodules")
    assert missing.status_code == 404


def test_post_nesting_reaches_max_depth_then_fails(module_client: TestClient) -> None:
    r = module_client.post(
        "/api/v1/master-data/modules",
        json=_create_json("d1", "depth-1"),
    )
    assert r.status_code == 201
    assert r.json()["data"]["level"] == 1
    prev: str = r.json()["data"]["id"]
    for lv in range(2, 11):
        r = module_client.post(
            "/api/v1/master-data/modules",
            json=_create_json(f"n{lv}", f"depth-{lv}", parent_id=prev),
        )
        assert r.status_code == 201, r.text
        assert r.json()["data"]["level"] == lv
        prev = r.json()["data"]["id"]
    overflow = module_client.post(
        "/api/v1/master-data/modules",
        json=_create_json("too", "depth-overflow", parent_id=prev),
    )
    assert overflow.status_code == 400


def test_post_rejects_level_in_body_extra_forbid(module_client: TestClient) -> None:
    body = _create_json("r2", "root-two")
    body["level"] = 1
    r = module_client.post("/api/v1/master-data/modules", json=body)
    assert r.status_code == 422


def test_patch_rejects_level_in_body_extra_forbid(module_client: TestClient) -> None:
    pa = module_client.post("/api/v1/master-data/modules", json=_create_json("pa", "pa-slug"))
    assert pa.status_code == 201
    id_b = pa.json()["data"]["id"]
    r = module_client.patch(
        f"/api/v1/master-data/modules/{id_b}",
        json={"level": 1},
    )
    assert r.status_code == 422


def test_delete_unknown_module_404(module_client: TestClient) -> None:
    r = module_client.delete(f"/api/v1/master-data/modules/{uuid4()}")
    assert r.status_code == 404


def test_patch_unknown_module_404(module_client: TestClient) -> None:
    r = module_client.patch(f"/api/v1/master-data/modules/{uuid4()}", json={"name": "x"})
    assert r.status_code == 404


def test_list_modules_for_nav_active_only(module_client: TestClient) -> None:
    active = module_client.post(
        "/api/v1/master-data/modules",
        json=_create_json("nav-active", "nav-active"),
    )
    assert active.status_code == 201
    inactive = module_client.post(
        "/api/v1/master-data/modules",
        json=_create_json("nav-inactive", "nav-inactive", is_active=False),
    )
    assert inactive.status_code == 201
    inactive_id = inactive.json()["data"]["id"]

    nav = module_client.get("/api/v1/master-data/modules/nav")
    assert nav.status_code == 200
    body = nav.json()
    assert "total" not in body
    slugs = {row["slug"] for row in body["data"]}
    assert "nav-active" in slugs
    assert "nav-inactive" not in slugs

    for row in body["data"]:
        if row["slug"] == "nav-active":
            assert set(row.keys()) == {
                "id",
                "iq_tenant_id",
                "parent_id",
                "name",
                "slug",
                "category",
                "level",
                "module_kind",
                "display_order",
                "icon",
            }
            break
    else:
        raise AssertionError("nav-active row missing")

    module_client.delete(f"/api/v1/master-data/modules/{inactive_id}")
    nav_after_delete = module_client.get("/api/v1/master-data/modules/nav")
    assert nav_after_delete.status_code == 200
    assert "nav-inactive" not in {row["slug"] for row in nav_after_delete.json()["data"]}


# ---------- module_kind filtering ----------


def test_list_modules_no_filter_returns_all_kinds(module_client: TestClient) -> None:
    """Without module_kind param, all kinds are returned (backward compatible)."""
    module_client.post(
        "/api/v1/master-data/modules",
        json=_create_json("mk-platform", "mk-platform", module_kind="platform"),
    )
    module_client.post(
        "/api/v1/master-data/modules",
        json=_create_json("mk-foundation", "mk-foundation", module_kind="foundation"),
    )
    module_client.post(
        "/api/v1/master-data/modules",
        json=_create_json("mk-product", "mk-product", module_kind="product"),
    )
    r = module_client.get("/api/v1/master-data/modules")
    assert r.status_code == 200
    kinds = {row["module_kind"] for row in r.json()["data"]}
    assert kinds == {"platform", "foundation", "product"}


def test_list_modules_filter_single_kind(module_client: TestClient) -> None:
    module_client.post(
        "/api/v1/master-data/modules",
        json=_create_json("fk-plat", "fk-plat", module_kind="platform"),
    )
    module_client.post(
        "/api/v1/master-data/modules",
        json=_create_json("fk-prod", "fk-prod", module_kind="product"),
    )
    r = module_client.get("/api/v1/master-data/modules?module_kind=product")
    assert r.status_code == 200
    body = r.json()
    assert all(row["module_kind"] == "product" for row in body["data"])
    slugs = {row["slug"] for row in body["data"]}
    assert "fk-prod" in slugs
    assert "fk-plat" not in slugs


def test_list_modules_filter_platform_returns_only_platform(module_client: TestClient) -> None:
    module_client.post(
        "/api/v1/master-data/modules",
        json=_create_json("pk-plat", "pk-plat", module_kind="platform"),
    )
    module_client.post(
        "/api/v1/master-data/modules",
        json=_create_json("pk-prod", "pk-prod", module_kind="product"),
    )
    r = module_client.get("/api/v1/master-data/modules?module_kind=platform")
    assert r.status_code == 200
    assert all(row["module_kind"] == "platform" for row in r.json()["data"])


def test_list_modules_filter_foundation_returns_only_foundation(module_client: TestClient) -> None:
    module_client.post(
        "/api/v1/master-data/modules",
        json=_create_json("fn-found", "fn-found", module_kind="foundation"),
    )
    module_client.post(
        "/api/v1/master-data/modules",
        json=_create_json("fn-prod", "fn-prod", module_kind="product"),
    )
    r = module_client.get("/api/v1/master-data/modules?module_kind=foundation")
    assert r.status_code == 200
    body = r.json()
    assert all(row["module_kind"] == "foundation" for row in body["data"])
    assert any(row["slug"] == "fn-found" for row in body["data"])


def test_list_modules_multi_kind_filter(module_client: TestClient) -> None:
    """Comma-separated module_kind returns the union of specified kinds."""
    module_client.post(
        "/api/v1/master-data/modules",
        json=_create_json("mk2-plat", "mk2-plat", module_kind="platform"),
    )
    module_client.post(
        "/api/v1/master-data/modules",
        json=_create_json("mk2-found", "mk2-found", module_kind="foundation"),
    )
    module_client.post(
        "/api/v1/master-data/modules",
        json=_create_json("mk2-prod", "mk2-prod", module_kind="product"),
    )
    r = module_client.get(
        "/api/v1/master-data/modules?module_kind=platform,foundation"
    )
    assert r.status_code == 200
    kinds = {row["module_kind"] for row in r.json()["data"]}
    assert kinds == {"platform", "foundation"}


def test_list_modules_invalid_kind_returns_422(module_client: TestClient) -> None:
    r = module_client.get("/api/v1/master-data/modules?module_kind=invalid_kind")
    assert r.status_code in (400, 422)
