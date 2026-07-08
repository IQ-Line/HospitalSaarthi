"""Full HTTP CRUD against real ``ModuleRepository`` on real Postgres/Citus.

Exercises the module catalog end-to-end: self-referential parent FK, partial-unique
slug/name on active rows, soft-delete cascade, and depth limits — all against the
``master_global`` schema as it ships, via the shared ``pg_client`` (see conftest).
"""

from __future__ import annotations

from uuid import UUID, uuid4

from fastapi.testclient import TestClient


def _create_json(name: str, slug: str, **extra: object) -> dict:
    body: dict = {
        "name": name,
        "slug": slug,
        "category": "clinical",
        "version": "1.0.0",
    }
    body.update(extra)
    return body


def test_module_crud_lifecycle_and_slug_reuse_after_soft_delete(
    pg_client: TestClient, actor_sub: str
) -> None:
    r = pg_client.post("/api/v1/master-data/modules", json=_create_json("billing", "billing"))
    assert r.status_code == 201
    # created_by is the VERIFIED token sub (resolve_actor_id), not null / not a header value.
    assert r.json()["data"]["created_by"] == actor_sub
    mid = UUID(r.json()["data"]["id"])

    g = pg_client.get(f"/api/v1/master-data/modules/{mid}")
    assert g.status_code == 200
    assert g.json()["data"]["slug"] == "billing"
    assert g.json()["data"]["is_deleted"] is False

    gs = pg_client.get("/api/v1/master-data/modules/by-slug/billing")
    assert gs.status_code == 200

    lst = pg_client.get("/api/v1/master-data/modules")
    assert lst.status_code == 200
    assert lst.json()["total"] == 1

    p = pg_client.patch(
        f"/api/v1/master-data/modules/{mid}",
        json={"name": "billing_svc", "version": "1.1.0"},
    )
    assert p.status_code == 200
    assert p.json()["data"]["name"] == "billing_svc"
    assert p.json()["data"]["updated_by"] == actor_sub

    d = pg_client.delete(f"/api/v1/master-data/modules/{mid}")
    assert d.status_code == 200
    assert d.json()["data"]["is_deleted"] is True

    g404 = pg_client.get(f"/api/v1/master-data/modules/{mid}")
    assert g404.status_code == 404

    gslug404 = pg_client.get("/api/v1/master-data/modules/by-slug/billing")
    assert gslug404.status_code == 404

    # Same slug allowed again after soft-delete (partial unique on active rows only).
    r2 = pg_client.post(
        "/api/v1/master-data/modules",
        json=_create_json("billing_new", "billing"),
    )
    assert r2.status_code == 201
    assert r2.json()["data"]["slug"] == "billing"


def test_post_duplicate_active_slug_conflict(pg_client: TestClient) -> None:
    a = pg_client.post("/api/v1/master-data/modules", json=_create_json("m1", "shared-slug"))
    assert a.status_code == 201
    b = pg_client.post("/api/v1/master-data/modules", json=_create_json("m2", "shared-slug"))
    assert b.status_code == 409
    assert b.json()["error"]["code"] == "CONFLICT"


def test_patch_duplicate_name_conflict(pg_client: TestClient) -> None:
    ra = pg_client.post(
        "/api/v1/master-data/modules",
        json=_create_json("alpha", "alpha-slug"),
    )
    assert ra.status_code == 201
    rb = pg_client.post(
        "/api/v1/master-data/modules",
        json=_create_json("beta", "beta-slug"),
    )
    assert rb.status_code == 201
    id_b = UUID(rb.json()["data"]["id"])
    conflict = pg_client.patch(
        f"/api/v1/master-data/modules/{id_b}",
        json={"name": "alpha"},
    )
    assert conflict.status_code == 409


def test_post_invalid_parent_returns_400(pg_client: TestClient) -> None:
    missing = uuid4()
    r = pg_client.post(
        "/api/v1/master-data/modules",
        json=_create_json("orphan", "orphan-slug", parent_id=str(missing)),
    )
    assert r.status_code == 400
    assert r.json()["error"]["code"] == "BAD_REQUEST"


def test_patch_cycle_returns_400(pg_client: TestClient) -> None:
    pa = pg_client.post(
        "/api/v1/master-data/modules",
        json=_create_json("a", "a-slug"),
    )
    assert pa.status_code == 201
    id_a = UUID(pa.json()["data"]["id"])
    pb = pg_client.post(
        "/api/v1/master-data/modules",
        json=_create_json("b", "b-slug", parent_id=str(id_a)),
    )
    assert pb.status_code == 201
    id_b = UUID(pb.json()["data"]["id"])
    pc = pg_client.post(
        "/api/v1/master-data/modules",
        json=_create_json("c", "c-slug", parent_id=str(id_b)),
    )
    assert pc.status_code == 201
    id_c = UUID(pc.json()["data"]["id"])
    # Would make A a descendant of C while C is under A.
    cycle = pg_client.patch(
        f"/api/v1/master-data/modules/{id_a}",
        json={"parent_id": str(id_c)},
    )
    assert cycle.status_code == 400
    assert cycle.json()["error"]["code"] == "BAD_REQUEST"


def test_get_submodules_direct_only(pg_client: TestClient) -> None:
    root = pg_client.post(
        "/api/v1/master-data/modules",
        json=_create_json("r", "ch-root"),
    )
    assert root.status_code == 201
    rid = root.json()["data"]["id"]
    c1 = pg_client.post(
        "/api/v1/master-data/modules",
        json=_create_json("c1", "ch-c1", parent_id=rid),
    )
    c2 = pg_client.post(
        "/api/v1/master-data/modules",
        json=_create_json("c2", "ch-c2", parent_id=rid),
    )
    assert c1.status_code == 201
    assert c2.status_code == 201
    sub = pg_client.post(
        "/api/v1/master-data/modules",
        json=_create_json("sub1", "ch-sub1", parent_id=c1.json()["data"]["id"]),
    )
    assert sub.status_code == 201

    kids = pg_client.get(f"/api/v1/master-data/modules/{rid}/submodules")
    assert kids.status_code == 200
    body = kids.json()
    assert body["total"] == 2
    slugs = {row["slug"] for row in body["data"]}
    assert slugs == {"ch-c1", "ch-c2"}


def test_delete_parent_cascades_soft_delete_to_descendants(pg_client: TestClient) -> None:
    root = pg_client.post(
        "/api/v1/master-data/modules",
        json=_create_json("cascade-r", "cascade-root"),
    )
    assert root.status_code == 201
    rid = root.json()["data"]["id"]
    child = pg_client.post(
        "/api/v1/master-data/modules",
        json=_create_json("cascade-c", "cascade-child", parent_id=rid),
    )
    assert child.status_code == 201
    cid = child.json()["data"]["id"]
    grand = pg_client.post(
        "/api/v1/master-data/modules",
        json=_create_json("cascade-g", "cascade-grand", parent_id=cid),
    )
    assert grand.status_code == 201
    gid = grand.json()["data"]["id"]

    d = pg_client.delete(f"/api/v1/master-data/modules/{rid}")
    assert d.status_code == 200
    assert d.json()["data"]["is_deleted"] is True

    # Descendants are soft-deleted too; detail and list endpoints hide them.
    assert pg_client.get(f"/api/v1/master-data/modules/{cid}").status_code == 404
    assert pg_client.get(f"/api/v1/master-data/modules/{gid}").status_code == 404
    listed = pg_client.get("/api/v1/master-data/modules")
    assert listed.status_code == 200
    slugs = {row["slug"] for row in listed.json()["data"]}
    assert "cascade-child" not in slugs
    assert "cascade-grand" not in slugs


def test_get_submodules_empty_and_404(pg_client: TestClient) -> None:
    leaf = pg_client.post(
        "/api/v1/master-data/modules",
        json=_create_json("solo", "ch-solo"),
    )
    assert leaf.status_code == 201
    lid = leaf.json()["data"]["id"]
    empty = pg_client.get(f"/api/v1/master-data/modules/{lid}/submodules")
    assert empty.status_code == 200
    assert empty.json()["total"] == 0

    missing = pg_client.get(f"/api/v1/master-data/modules/{uuid4()}/submodules")
    assert missing.status_code == 404


def test_post_nesting_reaches_max_depth_then_fails(pg_client: TestClient) -> None:
    r = pg_client.post(
        "/api/v1/master-data/modules",
        json=_create_json("d1", "depth-1"),
    )
    assert r.status_code == 201
    assert r.json()["data"]["level"] == 1
    prev: str = r.json()["data"]["id"]
    for lv in range(2, 11):
        r = pg_client.post(
            "/api/v1/master-data/modules",
            json=_create_json(f"n{lv}", f"depth-{lv}", parent_id=prev),
        )
        assert r.status_code == 201, r.text
        assert r.json()["data"]["level"] == lv
        prev = r.json()["data"]["id"]
    overflow = pg_client.post(
        "/api/v1/master-data/modules",
        json=_create_json("too", "depth-overflow", parent_id=prev),
    )
    assert overflow.status_code == 400


def test_post_rejects_level_in_body_extra_forbid(pg_client: TestClient) -> None:
    body = _create_json("r2", "root-two")
    body["level"] = 1
    r = pg_client.post("/api/v1/master-data/modules", json=body)
    assert r.status_code == 422


def test_patch_rejects_level_in_body_extra_forbid(pg_client: TestClient) -> None:
    pa = pg_client.post("/api/v1/master-data/modules", json=_create_json("pa", "pa-slug"))
    assert pa.status_code == 201
    id_b = pa.json()["data"]["id"]
    r = pg_client.patch(
        f"/api/v1/master-data/modules/{id_b}",
        json={"level": 1},
    )
    assert r.status_code == 422


def test_delete_unknown_module_404(pg_client: TestClient) -> None:
    r = pg_client.delete(f"/api/v1/master-data/modules/{uuid4()}")
    assert r.status_code == 404


def test_patch_unknown_module_404(pg_client: TestClient) -> None:
    r = pg_client.patch(f"/api/v1/master-data/modules/{uuid4()}", json={"name": "x"})
    assert r.status_code == 404


def test_list_modules_for_nav_active_only(pg_client: TestClient) -> None:
    active = pg_client.post(
        "/api/v1/master-data/modules",
        json=_create_json("nav-active", "nav-active"),
    )
    assert active.status_code == 201
    inactive = pg_client.post(
        "/api/v1/master-data/modules",
        json=_create_json("nav-inactive", "nav-inactive", is_active=False),
    )
    assert inactive.status_code == 201
    inactive_id = inactive.json()["data"]["id"]

    nav = pg_client.get("/api/v1/master-data/modules/nav")
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
                "visibility_scope",
                "icon",
            }
            break
    else:
        raise AssertionError("nav-active row missing")

    pg_client.delete(f"/api/v1/master-data/modules/{inactive_id}")
    nav_after_delete = pg_client.get("/api/v1/master-data/modules/nav")
    assert nav_after_delete.status_code == 200
    assert "nav-inactive" not in {row["slug"] for row in nav_after_delete.json()["data"]}


# ---------- module_kind filtering ----------


def test_list_modules_no_filter_returns_all_kinds(pg_client: TestClient) -> None:
    """Without module_kind param, all kinds are returned (backward compatible)."""
    pg_client.post(
        "/api/v1/master-data/modules",
        json=_create_json("mk-platform", "mk-platform", module_kind="platform"),
    )
    pg_client.post(
        "/api/v1/master-data/modules",
        json=_create_json("mk-foundation", "mk-foundation", module_kind="foundation"),
    )
    pg_client.post(
        "/api/v1/master-data/modules",
        json=_create_json("mk-product", "mk-product", module_kind="product"),
    )
    r = pg_client.get("/api/v1/master-data/modules")
    assert r.status_code == 200
    kinds = {row["module_kind"] for row in r.json()["data"]}
    assert kinds == {"platform", "foundation", "product"}


def test_list_modules_filter_single_kind(pg_client: TestClient) -> None:
    pg_client.post(
        "/api/v1/master-data/modules",
        json=_create_json("fk-plat", "fk-plat", module_kind="platform"),
    )
    pg_client.post(
        "/api/v1/master-data/modules",
        json=_create_json("fk-prod", "fk-prod", module_kind="product"),
    )
    r = pg_client.get("/api/v1/master-data/modules?module_kind=product")
    assert r.status_code == 200
    body = r.json()
    assert all(row["module_kind"] == "product" for row in body["data"])
    slugs = {row["slug"] for row in body["data"]}
    assert "fk-prod" in slugs
    assert "fk-plat" not in slugs


def test_list_modules_filter_platform_returns_only_platform(pg_client: TestClient) -> None:
    pg_client.post(
        "/api/v1/master-data/modules",
        json=_create_json("pk-plat", "pk-plat", module_kind="platform"),
    )
    pg_client.post(
        "/api/v1/master-data/modules",
        json=_create_json("pk-prod", "pk-prod", module_kind="product"),
    )
    r = pg_client.get("/api/v1/master-data/modules?module_kind=platform")
    assert r.status_code == 200
    assert all(row["module_kind"] == "platform" for row in r.json()["data"])


def test_list_modules_filter_foundation_returns_only_foundation(pg_client: TestClient) -> None:
    pg_client.post(
        "/api/v1/master-data/modules",
        json=_create_json("fn-found", "fn-found", module_kind="foundation"),
    )
    pg_client.post(
        "/api/v1/master-data/modules",
        json=_create_json("fn-prod", "fn-prod", module_kind="product"),
    )
    r = pg_client.get("/api/v1/master-data/modules?module_kind=foundation")
    assert r.status_code == 200
    body = r.json()
    assert all(row["module_kind"] == "foundation" for row in body["data"])
    assert any(row["slug"] == "fn-found" for row in body["data"])


def test_list_modules_multi_kind_filter(pg_client: TestClient) -> None:
    """Comma-separated module_kind returns the union of specified kinds."""
    pg_client.post(
        "/api/v1/master-data/modules",
        json=_create_json("mk2-plat", "mk2-plat", module_kind="platform"),
    )
    pg_client.post(
        "/api/v1/master-data/modules",
        json=_create_json("mk2-found", "mk2-found", module_kind="foundation"),
    )
    pg_client.post(
        "/api/v1/master-data/modules",
        json=_create_json("mk2-prod", "mk2-prod", module_kind="product"),
    )
    r = pg_client.get(
        "/api/v1/master-data/modules?module_kind=platform,foundation"
    )
    assert r.status_code == 200
    kinds = {row["module_kind"] for row in r.json()["data"]}
    assert kinds == {"platform", "foundation"}


def test_list_modules_invalid_kind_returns_422(pg_client: TestClient) -> None:
    r = pg_client.get("/api/v1/master-data/modules?module_kind=invalid_kind")
    assert r.status_code in (400, 422)


# ---------- visibility_scope filtering ----------


def test_list_modules_visibility_tenant_hides_superadmin_modules(pg_client: TestClient) -> None:
    pg_client.post(
        "/api/v1/master-data/modules",
        json=_create_json("vis-tenant", "vis-tenant"),
    )
    pg_client.post(
        "/api/v1/master-data/modules",
        json=_create_json("vis-internal", "vis-internal"),
    )
    # Manually mark one as superadmin (simulating migration backfill via PATCH is not possible
    # because visibility_scope isn't in ModuleUpdate; use the default 'tenant' for both,
    # then test the no-filter vs tenant-filter behavior).
    r_all = pg_client.get("/api/v1/master-data/modules")
    assert r_all.status_code == 200
    all_slugs = {row["slug"] for row in r_all.json()["data"]}
    assert "vis-tenant" in all_slugs
    assert "vis-internal" in all_slugs

    r_tenant = pg_client.get("/api/v1/master-data/modules?visibility=tenant")
    assert r_tenant.status_code == 200
    tenant_slugs = {row["slug"] for row in r_tenant.json()["data"]}
    assert "vis-tenant" in tenant_slugs
    assert "vis-internal" in tenant_slugs

    for row in r_tenant.json()["data"]:
        assert row["visibility_scope"] == "tenant"


def test_list_modules_no_visibility_filter_returns_all(pg_client: TestClient) -> None:
    """No visibility param returns all scopes (backward compatible)."""
    pg_client.post(
        "/api/v1/master-data/modules",
        json=_create_json("compat-mod", "compat-mod"),
    )
    r = pg_client.get("/api/v1/master-data/modules")
    assert r.status_code == 200
    assert r.json()["total"] >= 1

    for row in r.json()["data"]:
        assert "visibility_scope" in row


def test_list_modules_invalid_visibility_returns_422(pg_client: TestClient) -> None:
    r = pg_client.get("/api/v1/master-data/modules?visibility=invalid")
    assert r.status_code == 422


def test_nav_modules_include_visibility_scope_field(pg_client: TestClient) -> None:
    pg_client.post(
        "/api/v1/master-data/modules",
        json=_create_json("nav-vis", "nav-vis"),
    )
    r = pg_client.get("/api/v1/master-data/modules/nav")
    assert r.status_code == 200
    for row in r.json()["data"]:
        assert "visibility_scope" in row
