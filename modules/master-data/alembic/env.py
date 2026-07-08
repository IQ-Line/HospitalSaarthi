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

_MODULE_SCHEMAS = {GLOBAL_SCHEMA, TENANT_SCHEMA}


def _include_name(name, type_, parent_names) -> bool:
    """Autogenerate scope: only this module's schemas (skips Citus internals, public, etc.)."""
    if type_ == "schema":
        return name in _MODULE_SCHEMAS
    if type_ == "table":
        return name != "alembic_version"
    return True


def _prune_index_reflection_noise(context_, revision, directives) -> None:
    """Drop same-name drop+create index pairs from autogenerate output.

    The catalog's ``*_active_key`` indexes are functional partial indexes
    (``lower(trim(col)) ... WHERE NOT is_deleted``). Postgres reflects the expression
    as ``lower(TRIM(BOTH FROM col))``, which alembic cannot equate with the model's
    text, so autogenerate emits a drop+create of the *identical* index on every run.
    Pruning pairs that share (schema, table, name, unique) keeps ``alembic check``
    usable as a CI drift-gate. Narrowing: an in-place definition EDIT that keeps the
    same index name is invisible to the gate — rename the index when changing one.
    """
    from alembic.operations import ops as alembic_ops

    for directive in directives:
        op_roots = [directive.upgrade_ops, getattr(directive, "downgrade_ops", None)]
        for upgrade_ops in [root for root in op_roots if root is not None]:
            containers = [upgrade_ops] + [
                op for op in upgrade_ops.ops if isinstance(op, alembic_ops.ModifyTableOps)
            ]
            dropped: dict[tuple, list] = {}
            created: dict[tuple, list] = {}
            for container in containers:
                for op in container.ops:
                    if isinstance(op, alembic_ops.DropIndexOp):
                        key = (op.schema, op.table_name, op.index_name)
                        dropped.setdefault(key, []).append((container, op))
                    elif isinstance(op, alembic_ops.CreateIndexOp):
                        key = (op.schema, op.table_name, op.index_name)
                        created.setdefault(key, []).append((container, op))
            for key in set(dropped) & set(created):
                for container, op in dropped[key] + created[key]:
                    container.ops.remove(op)


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
            include_name=_include_name,
            process_revision_directives=_prune_index_reflection_noise,
            version_table_schema=GLOBAL_SCHEMA,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
