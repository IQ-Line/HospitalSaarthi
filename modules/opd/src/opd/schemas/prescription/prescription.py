"""Request/response models for prescription endpoints."""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from opd.models.prescription.enums import OrderItemStatus, PrescriptionStatus


class PrescriptionLegacyVitalsPayload(BaseModel):
    height_cm: Decimal | None = None
    weight_kg: Decimal | None = None
    bmi: Decimal | None = None
    temperature_c: Decimal | None = None
    pulse_bpm: int | None = None
    bp_systolic: int | None = None
    bp_diastolic: int | None = None
    respiratory_rate: int | None = None
    spo2_percent: int | None = None
    blood_sugar_mg_dl: Decimal | None = None
    notes: str | None = None


class PrescriptionVitalObservationPayload(BaseModel):
    line_no: int
    vital_code: str
    vital_global_id: UUID | None = None
    value_text: str
    unit_code: str | None = None
    recorded_at: datetime


class PrescriptionChiefComplaintPayload(BaseModel):
    line_no: int
    complaint_text: str
    duration_value: str | None = None
    duration_unit: str | None = None
    severity: str | None = None
    notes: str | None = None


class PrescriptionDiagnosisPayload(BaseModel):
    line_no: int
    notes: str | None = None
    certainty: str | None = None
    diagnosis_id: UUID | None = None


class PrescriptionSymptomPayload(BaseModel):
    line_no: int
    symptom_text: str


class PrescriptionMedicalHistoryPayload(BaseModel):
    smoking_status: str | None = None
    alcohol_status: str | None = None
    diet_type: str | None = None
    other_notes: str | None = None


class PrescriptionMedicalHistoryAllergyPayload(BaseModel):
    line_no: int
    allergen_text: str
    reaction_text: str | None = None
    severity: str | None = None
    notes: str | None = None


class PrescriptionMedicalHistoryChronicIllnessPayload(BaseModel):
    line_no: int
    illness_text: str
    since_text: str | None = None
    notes: str | None = None


class PrescriptionMedicineSubstitutionPayload(BaseModel):
    issued_medicine_id: UUID | None = None
    issued_name: str
    item_code: str | None = None
    quantity: Decimal | None = None
    form: str | None = None
    volume: str | None = None
    category: str | None = None
    reason: str | None = None


class PrescriptionMedicinePayload(BaseModel):
    line_no: int
    medicine_id: UUID | None = None
    name: str
    medicine_type: str | None = None
    strength: str | None = None
    sos: str | None = None
    dosage: str | None = None
    duration: str | None = None
    frequency: str | None = None
    quantity: Decimal | None = None
    route: str | None = None
    method: str | None = None
    status: str | None = None
    substitution: PrescriptionMedicineSubstitutionPayload | None = None


class PrescriptionOrderedTestPayload(BaseModel):
    line_no: int
    test_id: UUID | None = None
    external_id: str | None = None
    name: str
    due_by: datetime | None = None
    instructions: str | None = None
    status: OrderItemStatus = OrderItemStatus.PENDING


class PrescriptionOrderedImagingPayload(BaseModel):
    line_no: int
    external_id: str | None = None
    name: str
    due_by: datetime | None = None
    when_text: str | None = None
    instructions: str | None = None
    status: OrderItemStatus = OrderItemStatus.PENDING


class PrescriptionVaccineRequiredPayload(BaseModel):
    line_no: int
    vaccine_id: UUID | None = None
    vaccine_code: str | None = None
    name: str
    due_by: datetime | None = None
    instructions: str | None = None
    status: OrderItemStatus = OrderItemStatus.PENDING


class PrescriptionAdvisedProcedurePayload(BaseModel):
    line_no: int
    procedure_id: UUID | None = None
    procedure_name: str
    advised_date: date | None = None


class PrescriptionPhysicalActivityPayload(BaseModel):
    line_no: int
    steps_count: int | None = None
    sleep_duration_min: int | None = None
    calories_burned: int | None = None
    exercise_types: list[str] = Field(default_factory=list)


class PrescriptionCarePlanPayload(BaseModel):
    advice: str | None = None
    next_visit_value: int | None = None
    next_visit_unit: str | None = None
    refer_to: str | None = None


class PrescriptionClinicalPayload(BaseModel):
    """Nested clinical sections saved with the prescription aggregate."""

    legacy_vitals: PrescriptionLegacyVitalsPayload | None = None
    vital_observations: list[PrescriptionVitalObservationPayload] = Field(default_factory=list)
    chief_complaints: list[PrescriptionChiefComplaintPayload] = Field(default_factory=list)
    diagnoses: list[PrescriptionDiagnosisPayload] = Field(default_factory=list)
    symptoms: list[PrescriptionSymptomPayload] = Field(default_factory=list)
    medical_history: PrescriptionMedicalHistoryPayload | None = None
    medical_history_allergies: list[PrescriptionMedicalHistoryAllergyPayload] = Field(
        default_factory=list
    )
    medical_history_chronic_illnesses: list[PrescriptionMedicalHistoryChronicIllnessPayload] = (
        Field(default_factory=list)
    )
    medicines: list[PrescriptionMedicinePayload] = Field(default_factory=list)
    ordered_tests: list[PrescriptionOrderedTestPayload] = Field(default_factory=list)
    ordered_imaging: list[PrescriptionOrderedImagingPayload] = Field(default_factory=list)
    vaccines_required: list[PrescriptionVaccineRequiredPayload] = Field(default_factory=list)
    advised_procedures: list[PrescriptionAdvisedProcedurePayload] = Field(default_factory=list)
    physical_activities: list[PrescriptionPhysicalActivityPayload] = Field(default_factory=list)
    care_plan: PrescriptionCarePlanPayload | None = None


class PrescriptionCreate(BaseModel):
    # tenant_id and doctor_id are resolved from request headers (not the body) — see
    # core/tenant.py require_tenant_id and core/principal.py resolve_doctor_id.
    visit_id: UUID  # Same UUID as registration.registration.visit_id (registration module)
    patient_id: UUID
    vitals_schema_version: int = 1
    created_by: UUID | None = None
    clinical: PrescriptionClinicalPayload = Field(default_factory=PrescriptionClinicalPayload)


class PrescriptionUpdate(BaseModel):
    doctor_id: UUID | None = None
    vitals_schema_version: int | None = None
    updated_by: UUID | None = None
    clinical: PrescriptionClinicalPayload | None = None


class PrescriptionFinalizeRequest(BaseModel):
    changed_by: UUID | None = None


class PrescriptionCancelRequest(BaseModel):
    changed_by: UUID | None = None
    reason: str | None = None


# --- Responses ---


class TimestampedModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    created_at: datetime
    updated_at: datetime | None = None


class PrescriptionStatusHistoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    from_status: PrescriptionStatus | None
    to_status: PrescriptionStatus
    changed_at: datetime
    changed_by: UUID | None
    reason: str | None


class PrescriptionDetailResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tenant_id: UUID
    visit_id: UUID
    patient_id: UUID
    doctor_id: UUID
    vitals_schema_version: int
    status: PrescriptionStatus
    # OPD visit queue status from opd.visits (e.g. pre_consulted, in_progress).
    visit_status: str | None = None
    finalized_at: datetime | None
    cancelled_at: datetime | None
    deleted_at: datetime | None
    created_at: datetime
    updated_at: datetime
    created_by: UUID | None
    updated_by: UUID | None
    status_history: list[PrescriptionStatusHistoryResponse] = Field(default_factory=list)
    clinical: PrescriptionClinicalPayload = Field(default_factory=PrescriptionClinicalPayload)


class PrescriptionListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tenant_id: UUID
    visit_id: UUID
    patient_id: UUID
    doctor_id: UUID
    status: PrescriptionStatus
    finalized_at: datetime | None
    created_at: datetime
    updated_at: datetime


class PrescriptionListResponse(BaseModel):
    data: list[PrescriptionListItem]
    total: int


class PrescriptionSingleResponse(BaseModel):
    data: PrescriptionDetailResponse


class ClinicalReportAvailabilityItem(BaseModel):
    available: bool
    reason: str | None = None


class PrescriptionEncounterOverlay(BaseModel):
    status: PrescriptionStatus
    visit_status: str
    reports: dict[str, ClinicalReportAvailabilityItem] | None = None


class PrescriptionEncounterOverlayBatchResponse(BaseModel):
    data: dict[str, PrescriptionEncounterOverlay]
