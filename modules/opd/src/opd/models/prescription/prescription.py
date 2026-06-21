"""Aggregate root and status audit tables."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from opd.models.prescription.children import (
        PrescriptionAdvisedProcedureModel,
        PrescriptionCarePlanModel,
        PrescriptionChiefComplaintModel,
        PrescriptionDiagnosisModel,
        PrescriptionLegacyVitalsModel,
        PrescriptionMedicalHistoryAllergyModel,
        PrescriptionMedicalHistoryChronicIllnessModel,
        PrescriptionMedicalHistoryModel,
        PrescriptionMedicineModel,
        PrescriptionOrderedImagingModel,
        PrescriptionOrderedTestModel,
        PrescriptionPhysicalActivityModel,
        PrescriptionSymptomModel,
        PrescriptionVaccineRequiredModel,
        PrescriptionVitalObservationModel,
    )

from sqlalchemy import DateTime, ForeignKeyConstraint, Index, SmallInteger, Text, Uuid, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from opd.core.cross_refs import REGISTRATION_SCHEMA, REGISTRATION_VISIT_ID_COLUMN
from opd.core.schemas import SCHEMA
from opd.models.base import AuditActorMixin, Base, TimestampMixin
from opd.models.prescription.enums import PrescriptionStatus, prescription_status_column
from opd.models.prescription.mixins import TenantPrimaryKeyMixin

_SCHEMA = {"schema": SCHEMA}


class PrescriptionModel(TimestampMixin, AuditActorMixin, TenantPrimaryKeyMixin, Base):
    __tablename__ = "prescriptions"
    __table_args__ = (
        Index("prescriptions_tenant_patient_idx", "iq_tenant_id", "patient_id"),
        Index(
            "prescriptions_tenant_active_idx",
            "iq_tenant_id",
            postgresql_where=text("deleted_at IS NULL"),
            sqlite_where=text("deleted_at IS NULL"),
        ),
        Index(
            "prescriptions_tenant_visit_active_uq",
            "iq_tenant_id",
            "visit_id",
            unique=True,
            postgresql_where=text("deleted_at IS NULL"),
            sqlite_where=text("deleted_at IS NULL"),
        ),
        _SCHEMA,
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    visit_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        nullable=False,
        comment=(
            f"Logical ref {REGISTRATION_SCHEMA}.{REGISTRATION_VISIT_ID_COLUMN} "
            "(registration module); UNIQUE 1:1 with prescription; no cross-schema FK"
        ),
    )
    patient_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    doctor_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    vitals_schema_version: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=1)
    status: Mapped[PrescriptionStatus] = mapped_column(
        prescription_status_column(),
        nullable=False,
        default=PrescriptionStatus.DRAFT,
    )
    finalized_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    status_history: Mapped[list[PrescriptionStatusHistoryModel]] = relationship(
        back_populates="prescription",
        cascade="all, delete-orphan",
        order_by="PrescriptionStatusHistoryModel.changed_at",
    )
    legacy_vitals: Mapped[PrescriptionLegacyVitalsModel | None] = relationship(
        "PrescriptionLegacyVitalsModel",
        back_populates="prescription",
        cascade="all, delete-orphan",
        uselist=False,
    )
    vital_observations: Mapped[list[PrescriptionVitalObservationModel]] = relationship(
        "PrescriptionVitalObservationModel",
        back_populates="prescription",
        cascade="all, delete-orphan",
        order_by="PrescriptionVitalObservationModel.line_no",
    )
    chief_complaints: Mapped[list[PrescriptionChiefComplaintModel]] = relationship(
        "PrescriptionChiefComplaintModel",
        back_populates="prescription",
        cascade="all, delete-orphan",
        order_by="PrescriptionChiefComplaintModel.line_no",
    )
    diagnoses: Mapped[list[PrescriptionDiagnosisModel]] = relationship(
        "PrescriptionDiagnosisModel",
        back_populates="prescription",
        cascade="all, delete-orphan",
        order_by="PrescriptionDiagnosisModel.line_no",
    )
    symptoms: Mapped[list[PrescriptionSymptomModel]] = relationship(
        "PrescriptionSymptomModel",
        back_populates="prescription",
        cascade="all, delete-orphan",
        order_by="PrescriptionSymptomModel.line_no",
    )
    medical_history: Mapped[PrescriptionMedicalHistoryModel | None] = relationship(
        "PrescriptionMedicalHistoryModel",
        back_populates="prescription",
        cascade="all, delete-orphan",
        uselist=False,
    )
    medical_history_allergies: Mapped[list[PrescriptionMedicalHistoryAllergyModel]] = (
        relationship(
            "PrescriptionMedicalHistoryAllergyModel",
            back_populates="prescription",
            cascade="all, delete-orphan",
            order_by="PrescriptionMedicalHistoryAllergyModel.line_no",
        )
    )
    medical_history_chronic_illnesses: Mapped[
        list[PrescriptionMedicalHistoryChronicIllnessModel]
    ] = relationship(
        "PrescriptionMedicalHistoryChronicIllnessModel",
        back_populates="prescription",
        cascade="all, delete-orphan",
        order_by="PrescriptionMedicalHistoryChronicIllnessModel.line_no",
    )
    medicines: Mapped[list[PrescriptionMedicineModel]] = relationship(
        "PrescriptionMedicineModel",
        back_populates="prescription",
        cascade="all, delete-orphan",
        order_by="PrescriptionMedicineModel.line_no",
    )
    ordered_tests: Mapped[list[PrescriptionOrderedTestModel]] = relationship(
        "PrescriptionOrderedTestModel",
        back_populates="prescription",
        cascade="all, delete-orphan",
        order_by="PrescriptionOrderedTestModel.line_no",
    )
    ordered_imaging: Mapped[list[PrescriptionOrderedImagingModel]] = relationship(
        "PrescriptionOrderedImagingModel",
        back_populates="prescription",
        cascade="all, delete-orphan",
        order_by="PrescriptionOrderedImagingModel.line_no",
    )
    vaccines_required: Mapped[list[PrescriptionVaccineRequiredModel]] = relationship(
        "PrescriptionVaccineRequiredModel",
        back_populates="prescription",
        cascade="all, delete-orphan",
        order_by="PrescriptionVaccineRequiredModel.line_no",
    )
    advised_procedures: Mapped[list[PrescriptionAdvisedProcedureModel]] = relationship(
        "PrescriptionAdvisedProcedureModel",
        back_populates="prescription",
        cascade="all, delete-orphan",
        order_by="PrescriptionAdvisedProcedureModel.line_no",
    )
    physical_activities: Mapped[list[PrescriptionPhysicalActivityModel]] = relationship(
        "PrescriptionPhysicalActivityModel",
        back_populates="prescription",
        cascade="all, delete-orphan",
        order_by="PrescriptionPhysicalActivityModel.line_no",
    )
    care_plan: Mapped[PrescriptionCarePlanModel | None] = relationship(
        "PrescriptionCarePlanModel",
        back_populates="prescription",
        cascade="all, delete-orphan",
        uselist=False,
    )


class PrescriptionStatusHistoryModel(TenantPrimaryKeyMixin, Base):
    __tablename__ = "prescription_status_history"
    __table_args__ = (
        ForeignKeyConstraint(
            ["iq_tenant_id", "prescription_id"],
            [f"{SCHEMA}.prescriptions.iq_tenant_id", f"{SCHEMA}.prescriptions.id"],
            ondelete="CASCADE",
        ),
        Index("prescription_status_history_rx_idx", "iq_tenant_id", "prescription_id"),
        _SCHEMA,
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    prescription_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    from_status: Mapped[PrescriptionStatus | None] = mapped_column(
        prescription_status_column(), nullable=True
    )
    to_status: Mapped[PrescriptionStatus] = mapped_column(
        prescription_status_column(), nullable=False
    )
    changed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(UTC),
    )
    changed_by: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), nullable=True)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    prescription: Mapped[PrescriptionModel] = relationship(back_populates="status_history")
