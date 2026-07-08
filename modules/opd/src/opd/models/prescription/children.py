"""Child tables for the prescription aggregate."""

from __future__ import annotations

import uuid
from datetime import UTC, date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import (
    Date,
    DateTime,
    ForeignKeyConstraint,
    Integer,
    Numeric,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
    Uuid,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from opd.core.schemas import SCHEMA
from opd.models.base import Base, TimestampMixin
from opd.models.prescription.enums import OrderItemStatus, order_item_status_column
from opd.models.prescription.mixins import LineItemMixin, TenantPrimaryKeyMixin

if TYPE_CHECKING:
    from opd.models.prescription.prescription import PrescriptionModel

_SCHEMA = {"schema": SCHEMA}


def _rx_fk() -> ForeignKeyConstraint:
    return ForeignKeyConstraint(
        ["iq_tenant_id", "prescription_id"],
        [f"{SCHEMA}.prescriptions.iq_tenant_id", f"{SCHEMA}.prescriptions.id"],
        ondelete="CASCADE",
    )


def _med_fk() -> ForeignKeyConstraint:
    return ForeignKeyConstraint(
        ["iq_tenant_id", "prescription_medicine_id"],
        [f"{SCHEMA}.prescription_medicines.iq_tenant_id", f"{SCHEMA}.prescription_medicines.id"],
        ondelete="CASCADE",
    )


def _pa_fk() -> ForeignKeyConstraint:
    return ForeignKeyConstraint(
        ["iq_tenant_id", "physical_activity_id"],
        [
            f"{SCHEMA}.prescription_physical_activity.iq_tenant_id",
            f"{SCHEMA}.prescription_physical_activity.id",
        ],
        ondelete="CASCADE",
    )


class PrescriptionLegacyVitalsModel(TimestampMixin, TenantPrimaryKeyMixin, Base):
    __tablename__ = "prescription_legacy_vitals"
    __table_args__ = (_rx_fk(), _SCHEMA)

    prescription_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, nullable=False
    )
    height_cm: Mapped[Decimal | None] = mapped_column(Numeric(6, 2), nullable=True)
    weight_kg: Mapped[Decimal | None] = mapped_column(Numeric(6, 2), nullable=True)
    bmi: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    temperature_c: Mapped[Decimal | None] = mapped_column(Numeric(4, 1), nullable=True)
    pulse_bpm: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    bp_systolic: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    bp_diastolic: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    respiratory_rate: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    spo2_percent: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    blood_sugar_mg_dl: Mapped[Decimal | None] = mapped_column(Numeric(6, 1), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    prescription: Mapped[PrescriptionModel] = relationship(back_populates="legacy_vitals")


class PrescriptionVitalObservationModel(TimestampMixin, LineItemMixin, Base):
    __tablename__ = "prescription_vital_observations"
    __table_args__ = (
        _rx_fk(),
        UniqueConstraint(
            "iq_tenant_id", "prescription_id", "line_no", name="prescription_vital_obs_line_key"
        ),
        _SCHEMA,
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    prescription_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    vital_code: Mapped[str] = mapped_column(String(64), nullable=False)
    vital_global_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), nullable=True)
    value_text: Mapped[str] = mapped_column(String(512), nullable=False)
    unit_code: Mapped[str | None] = mapped_column(String(64), nullable=True)
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    prescription: Mapped[PrescriptionModel] = relationship(back_populates="vital_observations")


class PrescriptionChiefComplaintModel(TimestampMixin, LineItemMixin, Base):
    __tablename__ = "prescription_chief_complaints"
    __table_args__ = (
        _rx_fk(),
        UniqueConstraint(
            "iq_tenant_id", "prescription_id", "line_no", name="prescription_cc_line_key"
        ),
        _SCHEMA,
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    prescription_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    complaint_text: Mapped[str] = mapped_column(Text, nullable=False)
    duration_value: Mapped[str | None] = mapped_column(String(32), nullable=True)
    duration_unit: Mapped[str | None] = mapped_column(String(16), nullable=True)
    severity: Mapped[str | None] = mapped_column(String(32), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    prescription: Mapped[PrescriptionModel] = relationship(back_populates="chief_complaints")


class PrescriptionDiagnosisModel(TimestampMixin, LineItemMixin, Base):
    __tablename__ = "prescription_diagnoses"
    __table_args__ = (
        _rx_fk(),
        UniqueConstraint(
            "iq_tenant_id", "prescription_id", "line_no", name="prescription_dx_line_key"
        ),
        _SCHEMA,
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    prescription_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    certainty: Mapped[str | None] = mapped_column(String(32), nullable=True)
    diagnosis_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), nullable=True)

    prescription: Mapped[PrescriptionModel] = relationship(back_populates="diagnoses")


class PrescriptionSymptomModel(LineItemMixin, Base):
    __tablename__ = "prescription_symptoms"
    __table_args__ = (
        _rx_fk(),
        UniqueConstraint(
            "iq_tenant_id", "prescription_id", "line_no", name="prescription_symptoms_line_key"
        ),
        _SCHEMA,
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    prescription_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    symptom_text: Mapped[str] = mapped_column(String(256), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(UTC),
    )

    prescription: Mapped[PrescriptionModel] = relationship(back_populates="symptoms")


class PrescriptionMedicalHistoryModel(TimestampMixin, TenantPrimaryKeyMixin, Base):
    __tablename__ = "prescription_medical_histories"
    __table_args__ = (_rx_fk(), _SCHEMA)

    prescription_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, nullable=False
    )
    smoking_status: Mapped[str | None] = mapped_column(String(64), nullable=True)
    alcohol_status: Mapped[str | None] = mapped_column(String(64), nullable=True)
    diet_type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    other_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    prescription: Mapped[PrescriptionModel] = relationship(back_populates="medical_history")


class PrescriptionMedicalHistoryAllergyModel(TimestampMixin, LineItemMixin, Base):
    __tablename__ = "prescription_medical_history_allergies"
    __table_args__ = (
        _rx_fk(),
        UniqueConstraint(
            "iq_tenant_id", "prescription_id", "line_no", name="prescription_mh_allergy_line_key"
        ),
        _SCHEMA,
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    prescription_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    allergen_text: Mapped[str] = mapped_column(String(256), nullable=False)
    reaction_text: Mapped[str | None] = mapped_column(String(256), nullable=True)
    severity: Mapped[str | None] = mapped_column(String(32), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    prescription: Mapped[PrescriptionModel] = relationship(
        back_populates="medical_history_allergies"
    )


class PrescriptionMedicalHistoryChronicIllnessModel(TimestampMixin, LineItemMixin, Base):
    __tablename__ = "prescription_medical_history_chronic_illnesses"
    __table_args__ = (
        _rx_fk(),
        UniqueConstraint(
            "iq_tenant_id", "prescription_id", "line_no", name="prescription_mh_chronic_line_key"
        ),
        _SCHEMA,
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    prescription_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    illness_text: Mapped[str] = mapped_column(String(256), nullable=False)
    since_text: Mapped[str | None] = mapped_column(String(64), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    prescription: Mapped[PrescriptionModel] = relationship(
        back_populates="medical_history_chronic_illnesses"
    )


class PrescriptionMedicineModel(TimestampMixin, LineItemMixin, Base):
    __tablename__ = "prescription_medicines"
    __table_args__ = (
        _rx_fk(),
        UniqueConstraint(
            "iq_tenant_id", "prescription_id", "line_no", name="prescription_medicines_line_key"
        ),
        _SCHEMA,
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    prescription_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    medicine_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), nullable=True)
    name: Mapped[str] = mapped_column(String(512), nullable=False)
    medicine_type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    strength: Mapped[str | None] = mapped_column(String(128), nullable=True)
    sos: Mapped[str | None] = mapped_column(String(64), nullable=True)
    dosage: Mapped[str | None] = mapped_column(String(256), nullable=True)
    duration: Mapped[str | None] = mapped_column(String(128), nullable=True)
    frequency: Mapped[str | None] = mapped_column(String(128), nullable=True)
    quantity: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    route: Mapped[str | None] = mapped_column(String(64), nullable=True)
    method: Mapped[str | None] = mapped_column(String(128), nullable=True)
    status: Mapped[str | None] = mapped_column(String(32), nullable=True)

    prescription: Mapped[PrescriptionModel] = relationship(back_populates="medicines")
    substitution: Mapped[PrescriptionMedicineSubstitutionModel | None] = relationship(
        back_populates="medicine",
        cascade="all, delete-orphan",
        uselist=False,
    )


class PrescriptionMedicineSubstitutionModel(TimestampMixin, TenantPrimaryKeyMixin, Base):
    __tablename__ = "prescription_medicine_substitutions"
    __table_args__ = (_med_fk(), _rx_fk(), _SCHEMA)

    prescription_medicine_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, nullable=False
    )
    prescription_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    issued_medicine_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), nullable=True)
    issued_name: Mapped[str] = mapped_column(String(512), nullable=False)
    item_code: Mapped[str | None] = mapped_column(String(64), nullable=True)
    quantity: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    form: Mapped[str | None] = mapped_column(String(128), nullable=True)
    volume: Mapped[str | None] = mapped_column(String(64), nullable=True)
    category: Mapped[str | None] = mapped_column(String(128), nullable=True)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    medicine: Mapped[PrescriptionMedicineModel] = relationship(back_populates="substitution")


class PrescriptionOrderedTestModel(TimestampMixin, LineItemMixin, Base):
    __tablename__ = "prescription_ordered_tests"
    __table_args__ = (
        _rx_fk(),
        UniqueConstraint(
            "iq_tenant_id", "prescription_id", "line_no", name="prescription_ordered_tests_line_key"
        ),
        _SCHEMA,
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    prescription_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    test_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), nullable=True)
    external_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    name: Mapped[str] = mapped_column(String(512), nullable=False)
    due_by: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    instructions: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[OrderItemStatus] = mapped_column(
        order_item_status_column(),
        nullable=False,
        default=OrderItemStatus.PENDING,
    )

    prescription: Mapped[PrescriptionModel] = relationship(back_populates="ordered_tests")


class PrescriptionOrderedImagingModel(TimestampMixin, LineItemMixin, Base):
    __tablename__ = "prescription_ordered_imaging"
    __table_args__ = (
        _rx_fk(),
        UniqueConstraint(
            "iq_tenant_id",
            "prescription_id",
            "line_no",
            name="prescription_ordered_imaging_line_key",
        ),
        _SCHEMA,
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    prescription_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    external_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    name: Mapped[str] = mapped_column(String(512), nullable=False)
    due_by: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # Free-text "By When" the imaging is captured as in the Create-RX form (e.g. "in 2
    # weeks", "before next visit"). Distinct from the typed `due_by`, which the OPD form
    # does not populate; this preserves what the doctor actually typed on save/reload.
    when_text: Mapped[str | None] = mapped_column(String(256), nullable=True)
    instructions: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[OrderItemStatus] = mapped_column(
        order_item_status_column(),
        nullable=False,
        default=OrderItemStatus.PENDING,
    )

    prescription: Mapped[PrescriptionModel] = relationship(back_populates="ordered_imaging")


class PrescriptionVaccineRequiredModel(TimestampMixin, LineItemMixin, Base):
    __tablename__ = "prescription_vaccines_required"
    __table_args__ = (
        _rx_fk(),
        UniqueConstraint(
            "iq_tenant_id",
            "prescription_id",
            "line_no",
            name="prescription_vaccines_required_line_key",
        ),
        _SCHEMA,
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    prescription_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    vaccine_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), nullable=True)
    vaccine_code: Mapped[str | None] = mapped_column(String(64), nullable=True)
    name: Mapped[str] = mapped_column(String(512), nullable=False)
    due_by: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    instructions: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[OrderItemStatus] = mapped_column(
        order_item_status_column(),
        nullable=False,
        default=OrderItemStatus.PENDING,
    )

    prescription: Mapped[PrescriptionModel] = relationship(back_populates="vaccines_required")


class PrescriptionAdvisedProcedureModel(TimestampMixin, LineItemMixin, Base):
    __tablename__ = "prescription_advised_procedures"
    __table_args__ = (
        _rx_fk(),
        UniqueConstraint(
            "iq_tenant_id",
            "prescription_id",
            "line_no",
            name="prescription_advised_procedures_line_key",
        ),
        _SCHEMA,
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    prescription_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    procedure_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), nullable=True)
    procedure_name: Mapped[str] = mapped_column(String(512), nullable=False)
    advised_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    prescription: Mapped[PrescriptionModel] = relationship(back_populates="advised_procedures")


class PrescriptionPhysicalActivityModel(TimestampMixin, LineItemMixin, Base):
    __tablename__ = "prescription_physical_activity"
    __table_args__ = (
        _rx_fk(),
        UniqueConstraint(
            "iq_tenant_id",
            "prescription_id",
            "line_no",
            name="prescription_physical_activity_line_key",
        ),
        _SCHEMA,
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    prescription_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    steps_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    sleep_duration_min: Mapped[int | None] = mapped_column(Integer, nullable=True)
    calories_burned: Mapped[int | None] = mapped_column(Integer, nullable=True)

    prescription: Mapped[PrescriptionModel] = relationship(back_populates="physical_activities")
    exercise_types: Mapped[list[PrescriptionPhysicalActivityExerciseTypeModel]] = relationship(
        back_populates="physical_activity",
        cascade="all, delete-orphan",
    )


class PrescriptionPhysicalActivityExerciseTypeModel(TenantPrimaryKeyMixin, Base):
    __tablename__ = "prescription_physical_activity_exercise_types"
    __table_args__ = (_pa_fk(), _rx_fk(), _SCHEMA)

    physical_activity_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, nullable=False
    )
    prescription_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    exercise_type: Mapped[str] = mapped_column(String(128), primary_key=True)

    physical_activity: Mapped[PrescriptionPhysicalActivityModel] = relationship(
        back_populates="exercise_types"
    )


class PrescriptionCarePlanModel(TimestampMixin, TenantPrimaryKeyMixin, Base):
    __tablename__ = "prescription_care_plans"
    __table_args__ = (_rx_fk(), _SCHEMA)

    prescription_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, nullable=False
    )
    advice: Mapped[str | None] = mapped_column(Text, nullable=True)
    next_visit_value: Mapped[int | None] = mapped_column(Integer, nullable=True)
    next_visit_unit: Mapped[str | None] = mapped_column(String(16), nullable=True)
    refer_to: Mapped[str | None] = mapped_column(String(512), nullable=True)

    prescription: Mapped[PrescriptionModel] = relationship(back_populates="care_plan")
