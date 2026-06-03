import sys
from logging.config import fileConfig
from pathlib import Path

# Migration revisions import alembic/schema_names.py without pulling in the app package.
sys.path.insert(0, str(Path(__file__).resolve().parent))

from sqlalchemy import engine_from_config, pool, text

from alembic import context
from app.core.catalog_schemas import GLOBAL_SCHEMA, TENANT_SCHEMA
from app.core.config import get_settings
from app.models import Base

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def get_url() -> str:
    return get_settings().database_url


def _ensure_catalog_schemas(connection) -> None:
    connection.execute(text(f"CREATE SCHEMA IF NOT EXISTS {GLOBAL_SCHEMA}"))
    connection.execute(text(f"CREATE SCHEMA IF NOT EXISTS {TENANT_SCHEMA}"))
    connection.execute(
        text(f"SET search_path TO {GLOBAL_SCHEMA}, {TENANT_SCHEMA}, public"),
    )


def run_migrations_offline() -> None:
    context.configure(
        url=get_url(),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        include_schemas=True,
        version_table_schema=GLOBAL_SCHEMA,
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
        _ensure_catalog_schemas(connection)
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            include_schemas=True,
            version_table_schema=GLOBAL_SCHEMA,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
