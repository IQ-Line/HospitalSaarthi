"""SQLAlchemy repository for the prescription aggregate."""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session, selectinload

from opd.models.prescription import (
    PrescriptionAdvisedProcedureModel,
    PrescriptionCarePlanModel,
    PrescriptionChiefComplaintModel,
    PrescriptionDiagnosisModel,
    PrescriptionLegacyVitalsModel,
    PrescriptionMedicalHistoryAllergyModel,
    PrescriptionMedicalHistoryChronicIllnessModel,
    PrescriptionMedicalHistoryModel,
    PrescriptionMedicineModel,
    PrescriptionMedicineSubstitutionModel,
    PrescriptionModel,
    PrescriptionOrderedImagingModel,
    PrescriptionOrderedTestModel,
    PrescriptionPhysicalActivityExerciseTypeModel,
    PrescriptionPhysicalActivityModel,
    PrescriptionStatus,
    PrescriptionStatusHistoryModel,
    PrescriptionSymptomModel,
    PrescriptionVaccineRequiredModel,
    PrescriptionVitalObservationModel,
)
from opd.schemas.prescription.prescription import (
    PrescriptionClinicalPayload,
    PrescriptionCreate,
    PrescriptionUpdate,
)


class PrescriptionNotFoundError(LookupError):
    pass


class PrescriptionConflictError(ValueError):
    pass


class PrescriptionRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def _root_query(self) -> Select[tuple[PrescriptionModel]]:
        """Lean lookup for state transitions and soft delete (no child eager loads)."""
        return select(PrescriptionModel).where(PrescriptionModel.deleted_at.is_(None))

    def _detail_query(self) -> Select[tuple[PrescriptionModel]]:
        return (
            self._root_query()
            .options(
                selectinload(PrescriptionModel.status_history),
                selectinload(PrescriptionModel.legacy_vitals),
                selectinload(PrescriptionModel.vital_observations),
                selectinload(PrescriptionModel.chief_complaints),
                selectinload(PrescriptionModel.diagnoses),
                selectinload(PrescriptionModel.symptoms),
                selectinload(PrescriptionModel.medical_history),
                selectinload(PrescriptionModel.medical_history_allergies),
                selectinload(PrescriptionModel.medical_history_chronic_illnesses),
                selectinload(PrescriptionModel.medicines).selectinload(
                    PrescriptionMedicineModel.substitution
                ),
                selectinload(PrescriptionModel.ordered_tests),
                selectinload(PrescriptionModel.ordered_imaging),
                selectinload(PrescriptionModel.vaccines_required),
                selectinload(PrescriptionModel.advised_procedures),
                selectinload(PrescriptionModel.physical_activities).selectinload(
                    PrescriptionPhysicalActivityModel.exercise_types
                ),
                selectinload(PrescriptionModel.care_plan),
            )
        )

    def _get_root_by_id(self, tenant_id: UUID, prescription_id: UUID) -> PrescriptionModel:
        row = self._session.scalar(
            self._root_query().where(
                PrescriptionModel.tenant_id == tenant_id,
                PrescriptionModel.id == prescription_id,
            )
        )
        if row is None:
            raise PrescriptionNotFoundError(f"Prescription {prescription_id} not found")
        return row

    def get_by_id(self, tenant_id: UUID, prescription_id: UUID) -> PrescriptionModel:
        row = self._session.scalar(
            self._detail_query().where(
                PrescriptionModel.tenant_id == tenant_id,
                PrescriptionModel.id == prescription_id,
            )
        )
        if row is None:
            raise PrescriptionNotFoundError(f"Prescription {prescription_id} not found")
        return row

    def get_by_visit_id(self, tenant_id: UUID, visit_id: UUID) -> PrescriptionModel:
        row = self._session.scalar(
            self._detail_query().where(
                PrescriptionModel.tenant_id == tenant_id,
                PrescriptionModel.visit_id == visit_id,
            )
        )
        if row is None:
            raise PrescriptionNotFoundError(f"Prescription for visit {visit_id} not found")
        return row

    def list_status_by_visit_ids(
        self,
        tenant_id: UUID,
        visit_ids: list[UUID],
    ) -> list[PrescriptionModel]:
        """Lean lookup of prescription status per visit (no clinical eager loads)."""
        if not visit_ids:
            return []
        return list(
            self._session.scalars(
                self._root_query().where(
                    PrescriptionModel.tenant_id == tenant_id,
                    PrescriptionModel.visit_id.in_(visit_ids),
                )
            )
        )

    def list_detail_by_visit_ids(
        self,
        tenant_id: UUID,
        visit_ids: list[UUID],
    ) -> list[PrescriptionModel]:
        """Full prescription rows for batch clinical report availability."""
        if not visit_ids:
            return []
        return list(
            self._session.scalars(
                self._detail_query().where(
                    PrescriptionModel.tenant_id == tenant_id,
                    PrescriptionModel.visit_id.in_(visit_ids),
                )
            )
        )

    @property
    def session(self) -> Session:
        return self._session

    def list_by_patient(
        self,
        tenant_id: UUID,
        patient_id: UUID,
        *,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[PrescriptionModel], int]:
        filters = (
            PrescriptionModel.tenant_id == tenant_id,
            PrescriptionModel.patient_id == patient_id,
            PrescriptionModel.deleted_at.is_(None),
        )
        total = self._session.scalar(
            select(func.count()).select_from(PrescriptionModel).where(*filters)
        )
        rows = list(
            self._session.scalars(
                select(PrescriptionModel)
                .where(*filters)
                .order_by(PrescriptionModel.created_at.desc())
                .limit(limit)
                .offset(offset)
            )
        )
        return rows, int(total or 0)

    def visit_has_prescription(self, tenant_id: UUID, visit_id: UUID) -> bool:
        existing = self._session.scalar(
            select(PrescriptionModel.id).where(
                PrescriptionModel.tenant_id == tenant_id,
                PrescriptionModel.visit_id == visit_id,
                PrescriptionModel.deleted_at.is_(None),
            )
        )
        return existing is not None

    def create(
        self,
        tenant_id: UUID,
        doctor_id: UUID,
        payload: PrescriptionCreate,
    ) -> PrescriptionModel:
        if self.visit_has_prescription(tenant_id, payload.visit_id):
            raise PrescriptionConflictError(
                f"Prescription already exists for visit {payload.visit_id}"
            )

        rx = PrescriptionModel(
            tenant_id=tenant_id,
            visit_id=payload.visit_id,
            patient_id=payload.patient_id,
            doctor_id=doctor_id,
            vitals_schema_version=payload.vitals_schema_version,
            status=PrescriptionStatus.DRAFT,
            created_by=payload.created_by,
            updated_by=payload.created_by,
        )
        self._session.add(rx)
        self._session.flush()

        rx.status_history.append(
            PrescriptionStatusHistoryModel(
                tenant_id=tenant_id,
                prescription_id=rx.id,
                from_status=None,
                to_status=PrescriptionStatus.DRAFT,
                changed_by=payload.created_by,
            )
        )
        self._apply_clinical(rx, payload.clinical)
        self._session.flush()
        return self.get_by_id(tenant_id, rx.id)

    def update(
        self, tenant_id: UUID, prescription_id: UUID, payload: PrescriptionUpdate
    ) -> PrescriptionModel:
        rx = self.get_by_id(tenant_id, prescription_id)
        if rx.status != PrescriptionStatus.DRAFT:
            raise PrescriptionConflictError("Only draft prescriptions can be updated")

        if payload.doctor_id is not None:
            rx.doctor_id = payload.doctor_id
        if payload.vitals_schema_version is not None:
            rx.vitals_schema_version = payload.vitals_schema_version
        if payload.updated_by is not None:
            rx.updated_by = payload.updated_by

        if payload.clinical is not None:
            self._clear_clinical_children(rx)
            # Flush deletes before inserts — same line_no would violate *_line_key constraints.
            self._session.flush()
            self._apply_clinical(rx, payload.clinical)

        self._session.flush()
        return self.get_by_id(tenant_id, prescription_id)

    def finalize(
        self, tenant_id: UUID, prescription_id: UUID, *, changed_by: UUID | None
    ) -> PrescriptionModel:
        rx = self._get_root_by_id(tenant_id, prescription_id)
        if rx.status != PrescriptionStatus.DRAFT:
            raise PrescriptionConflictError("Only draft prescriptions can be finalized")

        previous = rx.status
        now = datetime.now(UTC)
        rx.status = PrescriptionStatus.FINAL
        rx.finalized_at = now
        rx.updated_by = changed_by
        rx.status_history.append(
            PrescriptionStatusHistoryModel(
                tenant_id=tenant_id,
                prescription_id=rx.id,
                from_status=previous,
                to_status=PrescriptionStatus.FINAL,
                changed_by=changed_by,
            )
        )
        self._session.flush()
        return self.get_by_id(tenant_id, prescription_id)

    def cancel(
        self,
        tenant_id: UUID,
        prescription_id: UUID,
        *,
        changed_by: UUID | None,
        reason: str | None,
    ) -> PrescriptionModel:
        rx = self._get_root_by_id(tenant_id, prescription_id)
        if rx.status == PrescriptionStatus.CANCELLED:
            raise PrescriptionConflictError("Prescription is already cancelled")
        if rx.status == PrescriptionStatus.FINAL:
            raise PrescriptionConflictError("Finalized prescriptions cannot be cancelled")

        previous = rx.status
        now = datetime.now(UTC)
        rx.status = PrescriptionStatus.CANCELLED
        rx.cancelled_at = now
        rx.updated_by = changed_by
        rx.status_history.append(
            PrescriptionStatusHistoryModel(
                tenant_id=tenant_id,
                prescription_id=rx.id,
                from_status=previous,
                to_status=PrescriptionStatus.CANCELLED,
                changed_by=changed_by,
                reason=reason,
            )
        )
        self._session.flush()
        return self.get_by_id(tenant_id, prescription_id)

    def soft_delete(self, tenant_id: UUID, prescription_id: UUID) -> PrescriptionModel:
        rx = self._get_root_by_id(tenant_id, prescription_id)
        rx.deleted_at = datetime.now(UTC)
        self._session.flush()
        return rx

    def _clear_clinical_children(self, rx: PrescriptionModel) -> None:
        for collection in (
            rx.vital_observations,
            rx.chief_complaints,
            rx.diagnoses,
            rx.symptoms,
            rx.medical_history_allergies,
            rx.medical_history_chronic_illnesses,
            rx.medicines,
            rx.ordered_tests,
            rx.ordered_imaging,
            rx.vaccines_required,
            rx.advised_procedures,
            rx.physical_activities,
        ):
            collection.clear()
        rx.legacy_vitals = None
        rx.medical_history = None
        rx.care_plan = None

    def _apply_clinical(self, rx: PrescriptionModel, clinical: PrescriptionClinicalPayload) -> None:
        tenant_id = rx.tenant_id
        prescription_id = rx.id

        if clinical.legacy_vitals is not None:
            lv = clinical.legacy_vitals
            rx.legacy_vitals = PrescriptionLegacyVitalsModel(
                prescription_id=prescription_id,
                tenant_id=tenant_id,
                height_cm=lv.height_cm,
                weight_kg=lv.weight_kg,
                bmi=lv.bmi,
                temperature_c=lv.temperature_c,
                pulse_bpm=lv.pulse_bpm,
                bp_systolic=lv.bp_systolic,
                bp_diastolic=lv.bp_diastolic,
                respiratory_rate=lv.respiratory_rate,
                spo2_percent=lv.spo2_percent,
                blood_sugar_mg_dl=lv.blood_sugar_mg_dl,
                notes=lv.notes,
            )

        for item in clinical.vital_observations:
            rx.vital_observations.append(
                PrescriptionVitalObservationModel(
                    tenant_id=tenant_id,
                    prescription_id=prescription_id,
                    line_no=item.line_no,
                    vital_code=item.vital_code,
                    vital_global_id=item.vital_global_id,
                    value_text=item.value_text,
                    unit_code=item.unit_code,
                    recorded_at=item.recorded_at,
                )
            )

        for item in clinical.chief_complaints:
            rx.chief_complaints.append(
                PrescriptionChiefComplaintModel(
                    tenant_id=tenant_id,
                    prescription_id=prescription_id,
                    line_no=item.line_no,
                    complaint_text=item.complaint_text,
                    duration_value=item.duration_value,
                    duration_unit=item.duration_unit,
                    severity=item.severity,
                    notes=item.notes,
                )
            )

        for item in clinical.diagnoses:
            rx.diagnoses.append(
                PrescriptionDiagnosisModel(
                    tenant_id=tenant_id,
                    prescription_id=prescription_id,
                    line_no=item.line_no,
                    notes=item.notes,
                    certainty=item.certainty,
                    diagnosis_id=item.diagnosis_id,
                )
            )

        for item in clinical.symptoms:
            rx.symptoms.append(
                PrescriptionSymptomModel(
                    tenant_id=tenant_id,
                    prescription_id=prescription_id,
                    line_no=item.line_no,
                    symptom_text=item.symptom_text,
                    created_at=datetime.now(UTC),
                )
            )

        if clinical.medical_history is not None:
            mh = clinical.medical_history
            rx.medical_history = PrescriptionMedicalHistoryModel(
                prescription_id=prescription_id,
                tenant_id=tenant_id,
                smoking_status=mh.smoking_status,
                alcohol_status=mh.alcohol_status,
                other_notes=mh.other_notes,
            )

        for item in clinical.medical_history_allergies:
            rx.medical_history_allergies.append(
                PrescriptionMedicalHistoryAllergyModel(
                    tenant_id=tenant_id,
                    prescription_id=prescription_id,
                    line_no=item.line_no,
                    allergen_text=item.allergen_text,
                    reaction_text=item.reaction_text,
                    severity=item.severity,
                    notes=item.notes,
                )
            )

        for item in clinical.medical_history_chronic_illnesses:
            rx.medical_history_chronic_illnesses.append(
                PrescriptionMedicalHistoryChronicIllnessModel(
                    tenant_id=tenant_id,
                    prescription_id=prescription_id,
                    line_no=item.line_no,
                    illness_text=item.illness_text,
                    since_text=item.since_text,
                    notes=item.notes,
                )
            )

        for item in clinical.medicines:
            med = PrescriptionMedicineModel(
                tenant_id=tenant_id,
                prescription_id=prescription_id,
                line_no=item.line_no,
                medicine_id=item.medicine_id,
                name=item.name,
                medicine_type=item.medicine_type,
                strength=item.strength,
                sos=item.sos,
                dosage=item.dosage,
                duration=item.duration,
                frequency=item.frequency,
                quantity=item.quantity,
                route=item.route,
                method=item.method,
                status=item.status,
            )
            if item.substitution is not None:
                sub = item.substitution
                med.substitution = PrescriptionMedicineSubstitutionModel(
                    tenant_id=tenant_id,
                    prescription_id=prescription_id,
                    issued_medicine_id=sub.issued_medicine_id,
                    issued_name=sub.issued_name,
                    item_code=sub.item_code,
                    quantity=sub.quantity,
                    form=sub.form,
                    volume=sub.volume,
                    category=sub.category,
                    reason=sub.reason,
                )
            rx.medicines.append(med)

        for item in clinical.ordered_tests:
            rx.ordered_tests.append(
                PrescriptionOrderedTestModel(
                    tenant_id=tenant_id,
                    prescription_id=prescription_id,
                    line_no=item.line_no,
                    test_id=item.test_id,
                    external_id=item.external_id,
                    name=item.name,
                    due_by=item.due_by,
                    instructions=item.instructions,
                    status=item.status,
                )
            )

        for item in clinical.ordered_imaging:
            rx.ordered_imaging.append(
                PrescriptionOrderedImagingModel(
                    tenant_id=tenant_id,
                    prescription_id=prescription_id,
                    line_no=item.line_no,
                    external_id=item.external_id,
                    name=item.name,
                    due_by=item.due_by,
                    instructions=item.instructions,
                    status=item.status,
                )
            )

        for item in clinical.vaccines_required:
            rx.vaccines_required.append(
                PrescriptionVaccineRequiredModel(
                    tenant_id=tenant_id,
                    prescription_id=prescription_id,
                    line_no=item.line_no,
                    vaccine_id=item.vaccine_id,
                    vaccine_code=item.vaccine_code,
                    name=item.name,
                    due_by=item.due_by,
                    instructions=item.instructions,
                    status=item.status,
                )
            )

        for item in clinical.advised_procedures:
            rx.advised_procedures.append(
                PrescriptionAdvisedProcedureModel(
                    tenant_id=tenant_id,
                    prescription_id=prescription_id,
                    line_no=item.line_no,
                    procedure_id=item.procedure_id,
                    procedure_name=item.procedure_name,
                    advised_date=item.advised_date,
                )
            )

        for item in clinical.physical_activities:
            pa = PrescriptionPhysicalActivityModel(
                tenant_id=tenant_id,
                prescription_id=prescription_id,
                line_no=item.line_no,
                steps_count=item.steps_count,
                sleep_duration_min=item.sleep_duration_min,
                calories_burned=item.calories_burned,
            )
            for exercise_type in item.exercise_types:
                pa.exercise_types.append(
                    PrescriptionPhysicalActivityExerciseTypeModel(
                        tenant_id=tenant_id,
                        prescription_id=prescription_id,
                        exercise_type=exercise_type,
                    )
                )
            rx.physical_activities.append(pa)

        if clinical.care_plan is not None:
            cp = clinical.care_plan
            rx.care_plan = PrescriptionCarePlanModel(
                prescription_id=prescription_id,
                tenant_id=tenant_id,
                advice=cp.advice,
                next_visit_value=cp.next_visit_value,
                next_visit_unit=cp.next_visit_unit,
                refer_to=cp.refer_to,
            )
