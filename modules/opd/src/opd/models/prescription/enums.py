"""PostgreSQL enum types for the prescription domain."""

from enum import StrEnum

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ENUM

from opd.core.schemas import SCHEMA

PRESCRIPTION_STATUS_DB = ENUM(
    "draft",
    "final",
    "cancelled",
    name="prescription_status",
    schema=SCHEMA,
    create_type=False,
)

ORDER_ITEM_STATUS_DB = ENUM(
    "pending",
    "completed",
    "cancelled",
    name="order_item_status",
    schema=SCHEMA,
    create_type=False,
)


class PrescriptionStatus(StrEnum):
    DRAFT = "draft"
    FINAL = "final"
    CANCELLED = "cancelled"


class OrderItemStatus(StrEnum):
    PENDING = "pending"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


def prescription_status_column(**kwargs: object) -> sa.Enum:
    return sa.Enum(
        PrescriptionStatus,
        name="prescription_status",
        schema=SCHEMA,
        values_callable=lambda enum: [member.value for member in enum],
        **kwargs,
    )


def order_item_status_column(**kwargs: object) -> sa.Enum:
    return sa.Enum(
        OrderItemStatus,
        name="order_item_status",
        schema=SCHEMA,
        values_callable=lambda enum: [member.value for member in enum],
        **kwargs,
    )
