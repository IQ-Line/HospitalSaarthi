"""Master Data service composition root.

Thin deployment host: imports ``create_app`` from the Master Data module and
instantiates the served ASGI app. The module composes everything (routes,
middleware, and the in-process authorization PEP) inside ``create_app``; this
wrapper owns only the process entry-point.

Run: ``uvicorn master_data_svc.main:app``.
"""

from __future__ import annotations

from app.main import create_app

app = create_app()
