import uuid

from sqlalchemy import Boolean, CheckConstraint, String, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class ModuleModel(TimestampMixin, Base):
    __tablename__ = "modules"
    __table_args__ = (
        CheckConstraint(
            "category IN ('core', 'clinical', 'administrative', 'support')",
            name="modules_category_check",
        ),
        UniqueConstraint("name", name="modules_name_key"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    display_name: Mapped[str] = mapped_column(String(160), nullable=False)
    category: Mapped[str] = mapped_column(String(32), nullable=False)
    is_core: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    version: Mapped[str] = mapped_column(String(32), nullable=False)
