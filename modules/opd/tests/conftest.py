"""Pytest fixtures for the OPD module.

Scaffold-time fixtures: a FastAPI ``TestClient`` against ``create_app()``.
Add domain fixtures (DB sessions, mock repos, event-bus stubs) as the module
grows.
"""

from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient

from opd import create_app


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    app = create_app()
    with TestClient(app) as test_client:
        yield test_client
