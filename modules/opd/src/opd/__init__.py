"""OPD module — public API.

Service wrappers should import ``create_app`` and provide concrete adapters
(``deps``) constructed at the composition root.
"""

from opd.main import create_app

__all__ = ["create_app"]
