import os
from collections.abc import Iterator

import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.models import Base


@pytest.fixture(autouse=True)
def _api_prefix_for_tests() -> Iterator[None]:
    """Force a stable API prefix for tests (overrides workspace or package `.env`)."""
    os.environ["MASTER_DATA_API_PREFIX"] = "/api/v1/master-data"
    os.environ["MASTER_DATA_AUTH_BYPASS"] = "false"
    os.environ["MASTER_DATA_AUTHZ_ENABLED"] = "false"
    os.environ.pop("MASTER_DATA_DEV_BEARER_TOKEN", None)
    from app.core.config import get_settings

    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


@pytest.fixture()
def sqlite_session() -> Iterator[Session]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    @event.listens_for(engine, "connect")
    def _sqlite_attach(dbapi_connection, _connection_record) -> None:
        dbapi_connection.execute("PRAGMA foreign_keys=ON")
        dbapi_connection.execute("ATTACH DATABASE ':memory:' AS tenant_master")
        dbapi_connection.execute("ATTACH DATABASE ':memory:' AS global_master")

    with engine.begin() as conn:
        Base.metadata.create_all(bind=conn)

    session_factory = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    session = session_factory()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(engine)
