"""OPD service composition root.

Imports ``create_app`` from the OPD module and wires concrete adapters here.
For the scaffold no adapters are wired yet; ``deps`` will carry repos, the
event publisher, and identity/authz clients once they exist.
"""

from __future__ import annotations

import logging
import os

from opd import create_app
from opd.core.migrations import apply_opd_migrations

logger = logging.getLogger(__name__)

if os.environ.get("OPD_SKIP_MIGRATE", "").lower() != "true":
    apply_opd_migrations()
    logger.info("OPD schema migration applied (or already up to date)")

app = create_app()
