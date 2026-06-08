"""Patient health document metadata table.

Revision ID: 002_health_documents
Revises: 001_prescription_schema
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "002_health_documents"
down_revision: str | Sequence[str] | None = "001_prescription_schema"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

SCHEMA = "opd"


def upgrade() -> None:
    op.create_table(
        "health_documents",
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("patient_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("visit_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("hi_type", sa.Text(), nullable=False),
        sa.Column("document_title", sa.Text(), nullable=False),
        sa.Column("original_file_name", sa.Text(), nullable=False),
        sa.Column("storage_key", sa.Text(), nullable=False),
        sa.Column("blob_url", sa.Text(), nullable=False),
        sa.Column("mime_type", sa.Text(), nullable=False),
        sa.Column("file_size_bytes", sa.BigInteger(), nullable=True),
        sa.Column("uploaded_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("status", sa.Text(), nullable=False, server_default="active"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("updated_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.CheckConstraint(
            "status IN ('active', 'archived', 'deleted')",
            name="health_documents_status_chk",
        ),
        schema=SCHEMA,
    )
    op.create_index(
        "health_documents_tenant_patient_idx",
        "health_documents",
        ["tenant_id", "patient_id"],
        schema=SCHEMA,
    )
    op.create_index(
        "health_documents_tenant_visit_idx",
        "health_documents",
        ["tenant_id", "visit_id"],
        schema=SCHEMA,
    )


def downgrade() -> None:
    op.drop_index("health_documents_tenant_visit_idx", table_name="health_documents", schema=SCHEMA)
    op.drop_index("health_documents_tenant_patient_idx", table_name="health_documents", schema=SCHEMA)
    op.drop_table("health_documents", schema=SCHEMA)
