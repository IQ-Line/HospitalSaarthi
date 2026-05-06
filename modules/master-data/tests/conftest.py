import os
from collections.abc import Iterator

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.models import Base


@pytest.fixture(autouse=True)
def _api_prefix_for_tests() -> Iterator[None]:
    """Force a stable API prefix for tests (overrides local `.env`)."""
    os.environ["MASTER_DATA_API_PREFIX"] = "/api/v1/master-data"
    os.environ["MASTER_DATA_AUTH_BYPASS"] = "false"
    os.environ.pop("MASTER_DATA_DEV_BEARER_TOKEN", None)
    from app.core.config import get_settings

    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


@pytest.fixture()
def sqlite_session() -> Iterator[Session]:
    engine = create_engine("sqlite:///:memory:").execution_options(
        schema_translate_map={"master_data": None}
    )
    Base.metadata.create_all(engine)

    session_factory = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    session = session_factory()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(engine)
