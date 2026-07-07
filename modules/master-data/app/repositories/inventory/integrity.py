"""Shared integrity helpers for inventory master repositories."""

from sqlalchemy.exc import IntegrityError


def is_unique_violation(exc: IntegrityError) -> bool:
    orig = getattr(exc, "orig", None)
    if orig is None:
        return False
    if getattr(orig, "pgcode", None) == "23505":
        return True
    if getattr(orig, "sqlite_errorcode", None) in (1555, 2067):
        return True
    text = str(orig).lower()
    return (
        "unique constraint failed" in text
        or "duplicate key value violates unique constraint" in text
    )


class DuplicateInventoryCatalogKeyError(Exception):
    """Violates a partial unique index on an inventory catalog table."""

    def __init__(self, message: str | None = None) -> None:
        self.message = message or "Another active row already uses this unique key."
        super().__init__(self.message)
