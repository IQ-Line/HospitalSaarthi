"""Logging configuration: every record carries the current ``request_id``.

A ``LogRecord`` factory stamps ``record.request_id`` from
``request_id_ctx`` at creation time, so all handlers (our own, uvicorn's,
pytest's ``caplog``) see the field. Outside a request the value is ``"-"``.
"""

from __future__ import annotations

import logging
import sys

from app.core.config import get_settings
from app.core.request_context import get_request_id

_LOG_FORMAT = "%(asctime)s %(levelname)s [%(request_id)s] %(name)s: %(message)s"
_DATE_FORMAT = "%Y-%m-%dT%H:%M:%S%z"

_OUR_HANDLER_ATTR = "_master_data_logging_handler"
_FACTORY_INSTALLED = False


def _install_record_factory() -> None:
    """Wrap the active LogRecord factory once so every record gets ``request_id``."""
    global _FACTORY_INSTALLED
    if _FACTORY_INSTALLED:
        return
    base_factory = logging.getLogRecordFactory()

    def factory(*args: object, **kwargs: object) -> logging.LogRecord:
        record = base_factory(*args, **kwargs)
        rid = get_request_id()
        record.request_id = rid if rid is not None else "-"
        return record

    logging.setLogRecordFactory(factory)
    _FACTORY_INSTALLED = True


def configure_logging() -> None:
    settings = get_settings()
    raw_level = settings.log_level
    level = raw_level.upper() if isinstance(raw_level, str) else raw_level

    _install_record_factory()

    formatter = logging.Formatter(_LOG_FORMAT, datefmt=_DATE_FORMAT)
    root = logging.getLogger()
    root.setLevel(level)

    own = next(
        (h for h in root.handlers if getattr(h, _OUR_HANDLER_ATTR, False)),
        None,
    )
    if own is None:
        own = logging.StreamHandler(stream=sys.stdout)
        setattr(own, _OUR_HANDLER_ATTR, True)
        root.addHandler(own)
    own.setLevel(level)
    own.setFormatter(formatter)

    # Library loggers propagate to root (which has our handler + record factory).
    for name in ("uvicorn", "uvicorn.error", "uvicorn.access", "fastapi", "sqlalchemy.engine"):
        lg = logging.getLogger(name)
        lg.handlers = []
        lg.propagate = True


# Backwards-compatible filter for callers that prefer a Filter instance.
class RequestIdFilter(logging.Filter):
    """Stamp ``record.request_id`` on records created before ``configure_logging``."""

    def filter(self, record: logging.LogRecord) -> bool:
        if not hasattr(record, "request_id"):
            rid = get_request_id()
            record.request_id = rid if rid is not None else "-"
        return True
