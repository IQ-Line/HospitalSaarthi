import sys
from logging.config import fileConfig
from pathlib import Path

# Migration revisions import alembic/schema_names.py without pulling in the app package.
sys.path.insert(0, str(Path(__file__).resolve().parent))

from sqlalchemy import engine_from_config, pool, text

from alembic import context
from opd.core.config import get_settings
from opd.core.schemas import SCHEMA
from opd.models import Base

from schema_names import VERSION_TABLE

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def get_url() -> str:
    return get_settings().database_url


def _ensure_schema(connection) -> None:
    connection.execute(text(f"CREATE SCHEMA IF NOT EXISTS {SCHEMA}"))
    connection.execute(text(f"SET search_path TO {SCHEMA}, public"))


def run_migrations_offline() -> None:
    context.configure(
        url=get_url(),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        include_schemas=True,
        version_table=SCHEMA,
        version_table_schema=SCHEMA,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    configuration = config.get_section(config.config_ini_section, {})
    configuration["sqlalchemy.url"] = get_url()

    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.begin() as connection:
        _ensure_schema(connection)
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            include_schemas=True,
            version_table=VERSION_TABLE,
            version_table_schema=SCHEMA,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
