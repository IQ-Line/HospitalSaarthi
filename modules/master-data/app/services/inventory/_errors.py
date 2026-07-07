"""Domain validation errors for inventory master services."""

class InvalidInventoryCatalogError(Exception):
    def __init__(self, message: str) -> None:
        self.message = message
        super().__init__(message)
