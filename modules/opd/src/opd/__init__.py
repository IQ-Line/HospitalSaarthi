"""OPD module — public API.

Service wrappers should import ``create_app`` and provide concrete adapters
(``deps``) constructed at the composition root.

``create_app`` is loaded lazily so Alembic (``env.py``) can import models without
mounting the FastAPI router graph.
"""

__all__ = ["create_app"]


def __getattr__(name: str) -> object:
    if name == "create_app":
        from opd.main import create_app as _create_app

        return _create_app
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
