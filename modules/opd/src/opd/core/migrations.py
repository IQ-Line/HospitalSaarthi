"""Apply pending OPD Alembic revisions (all heads — branched history must use ``heads``)."""

from __future__ import annotations

import logging
from pathlib import Path

from alembic.config import Config

from alembic import command

logger = logging.getLogger(__name__)

# ``modules/opd`` package root (contains ``alembic.ini``).
_MODULE_ROOT = Path(__file__).resolve().parents[3]


def apply_opd_migrations() -> None:
    """Upgrade to every Alembic head (required when parallel branches exist)."""
    alembic_ini = _MODULE_ROOT / "alembic.ini"
    if not alembic_ini.is_file():
        raise FileNotFoundError(f"OPD alembic.ini not found at {alembic_ini}")

    cfg = Config(str(alembic_ini))
    # ``script_location`` in alembic.ini is relative; resolve from module root so
    # migrations work when opd-svc (cwd ``services/opd-svc``) imports this module.
    cfg.set_main_option("script_location", str(_MODULE_ROOT / "alembic"))
    cfg.set_main_option("prepend_sys_path", str(_MODULE_ROOT / "src"))
    # Branched chain: 001 → 002_health_documents and 001 → 0002 → 0003 merge at 003.
    # ``upgrade head`` (singular) can skip a branch; always use ``heads``.
    logger.info("Applying OPD database migrations (alembic upgrade heads)")
    command.upgrade(cfg, "heads")
    logger.info("OPD database migrations complete")


def main() -> None:
    logging.basicConfig(level=logging.INFO)
    apply_opd_migrations()


if __name__ == "__main__":
    main()
