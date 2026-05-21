"""Map ORM prescription aggregate to API response schemas."""

from __future__ import annotations

from opd.models.prescription import PrescriptionModel
from opd.schemas.prescription.prescription import (
    PrescriptionAdvisedProcedurePayload,
    PrescriptionCarePlanPayload,
    PrescriptionChiefComplaintPayload,
    PrescriptionClinicalPayload,
    PrescriptionDetailResponse,
    PrescriptionDiagnosisPayload,
    PrescriptionLegacyVitalsPayload,
    PrescriptionMedicalHistoryAllergyPayload,
    PrescriptionMedicalHistoryChronicIllnessPayload,
    PrescriptionMedicalHistoryPayload,
    PrescriptionMedicinePayload,
    PrescriptionMedicineSubstitutionPayload,
    PrescriptionOrderedImagingPayload,
    PrescriptionOrderedTestPayload,
    PrescriptionPhysicalActivityPayload,
    PrescriptionStatusHistoryResponse,
    PrescriptionSymptomPayload,
    PrescriptionVaccineRequiredPayload,
    PrescriptionVitalObservationPayload,
)


def prescription_to_detail(row: PrescriptionModel) -> PrescriptionDetailResponse:
    clinical = PrescriptionClinicalPayload()

    if row.legacy_vitals is not None:
        lv = row.legacy_vitals
        clinical.legacy_vitals = PrescriptionLegacyVitalsPayload(
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

    clinical.vital_observations = [
        PrescriptionVitalObservationPayload(
            line_no=v.line_no,
            vital_code=v.vital_code,
            vital_global_id=v.vital_global_id,
            value_text=v.value_text,
            unit_code=v.unit_code,
            recorded_at=v.recorded_at,
        )
        for v in row.vital_observations
    ]
    clinical.chief_complaints = [
        PrescriptionChiefComplaintPayload(
            line_no=c.line_no,
            complaint_text=c.complaint_text,
            duration_value=c.duration_value,
            duration_unit=c.duration_unit,
            severity=c.severity,
            notes=c.notes,
        )
        for c in row.chief_complaints
    ]
    clinical.diagnoses = [
        PrescriptionDiagnosisPayload(
            line_no=d.line_no,
            notes=d.notes,
            certainty=d.certainty,
            diagnosis_id=d.diagnosis_id,
        )
        for d in row.diagnoses
    ]
    clinical.symptoms = [
        PrescriptionSymptomPayload(line_no=s.line_no, symptom_text=s.symptom_text)
        for s in row.symptoms
    ]

    if row.medical_history is not None:
        mh = row.medical_history
        clinical.medical_history = PrescriptionMedicalHistoryPayload(
            smoking_status=mh.smoking_status,
            alcohol_status=mh.alcohol_status,
            other_notes=mh.other_notes,
        )

    clinical.medical_history_allergies = [
        PrescriptionMedicalHistoryAllergyPayload(
            line_no=a.line_no,
            allergen_text=a.allergen_text,
            reaction_text=a.reaction_text,
            severity=a.severity,
            notes=a.notes,
        )
        for a in row.medical_history_allergies
    ]
    clinical.medical_history_chronic_illnesses = [
        PrescriptionMedicalHistoryChronicIllnessPayload(
            line_no=c.line_no,
            illness_text=c.illness_text,
            since_text=c.since_text,
            notes=c.notes,
        )
        for c in row.medical_history_chronic_illnesses
    ]

    clinical.medicines = []
    for med in row.medicines:
        substitution = None
        if med.substitution is not None:
            sub = med.substitution
            substitution = PrescriptionMedicineSubstitutionPayload(
                issued_medicine_id=sub.issued_medicine_id,
                issued_name=sub.issued_name,
                item_code=sub.item_code,
                quantity=sub.quantity,
                form=sub.form,
                volume=sub.volume,
                category=sub.category,
                reason=sub.reason,
            )
        clinical.medicines.append(
            PrescriptionMedicinePayload(
                line_no=med.line_no,
                medicine_id=med.medicine_id,
                name=med.name,
                medicine_type=med.medicine_type,
                strength=med.strength,
                sos=med.sos,
                dosage=med.dosage,
                duration=med.duration,
                frequency=med.frequency,
                quantity=med.quantity,
                route=med.route,
                method=med.method,
                status=med.status,
                substitution=substitution,
            )
        )

    clinical.ordered_tests = [
        PrescriptionOrderedTestPayload(
            line_no=t.line_no,
            test_id=t.test_id,
            external_id=t.external_id,
            name=t.name,
            due_by=t.due_by,
            instructions=t.instructions,
            status=t.status,
        )
        for t in row.ordered_tests
    ]
    clinical.ordered_imaging = [
        PrescriptionOrderedImagingPayload(
            line_no=i.line_no,
            external_id=i.external_id,
            name=i.name,
            due_by=i.due_by,
            instructions=i.instructions,
            status=i.status,
        )
        for i in row.ordered_imaging
    ]
    clinical.vaccines_required = [
        PrescriptionVaccineRequiredPayload(
            line_no=v.line_no,
            vaccine_id=v.vaccine_id,
            vaccine_code=v.vaccine_code,
            name=v.name,
            due_by=v.due_by,
            instructions=v.instructions,
            status=v.status,
        )
        for v in row.vaccines_required
    ]
    clinical.advised_procedures = [
        PrescriptionAdvisedProcedurePayload(
            line_no=p.line_no,
            procedure_id=p.procedure_id,
            procedure_name=p.procedure_name,
            advised_date=p.advised_date,
        )
        for p in row.advised_procedures
    ]
    clinical.physical_activities = [
        PrescriptionPhysicalActivityPayload(
            line_no=pa.line_no,
            steps_count=pa.steps_count,
            sleep_duration_min=pa.sleep_duration_min,
            calories_burned=pa.calories_burned,
            exercise_types=[et.exercise_type for et in pa.exercise_types],
        )
        for pa in row.physical_activities
    ]

    if row.care_plan is not None:
        cp = row.care_plan
        clinical.care_plan = PrescriptionCarePlanPayload(
            advice=cp.advice,
            next_visit_value=cp.next_visit_value,
            next_visit_unit=cp.next_visit_unit,
            refer_to=cp.refer_to,
        )

    return PrescriptionDetailResponse(
        id=row.id,
        tenant_id=row.tenant_id,
        visit_id=row.visit_id,
        patient_id=row.patient_id,
        doctor_id=row.doctor_id,
        vitals_schema_version=row.vitals_schema_version,
        status=row.status,
        finalized_at=row.finalized_at,
        cancelled_at=row.cancelled_at,
        deleted_at=row.deleted_at,
        created_at=row.created_at,
        updated_at=row.updated_at,
        created_by=row.created_by,
        updated_by=row.updated_by,
        status_history=[
            PrescriptionStatusHistoryResponse.model_validate(h) for h in row.status_history
        ],
        clinical=clinical,
    )
