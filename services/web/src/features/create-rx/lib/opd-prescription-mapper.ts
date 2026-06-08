import type { CreateRxFormData } from '../types';
import type { OpdPrescriptionClinicalPayload, OpdPrescriptionDetail } from '../api/opd-prescription-types';
import { sanitizeCreateRxFormDataForPersist } from './form-data-session';
import {
  immunizationRowToVaccinePayload,
  vaccinePayloadToImmunizationRow,
} from './opd-immunization-meta';
import { formVitalsToLegacyVitals, legacyVitalsToFormVitals } from './opd-legacy-vitals';
import { formatMedicineDosageMan, parseMedicineDosageMan } from './medicine-dosage';
import { emptyComplaintRow, emptyImmunizationRow } from './row-factories';

function lineItems<T, R>(rows: T[], map: (row: T, index: number) => R): R[] {
  return rows.map((row, index) => map(row, index));
}

export function createRxFormDataToClinical(formData: CreateRxFormData): OpdPrescriptionClinicalPayload {
  const data = sanitizeCreateRxFormDataForPersist(formData);

  return {
    legacy_vitals: formVitalsToLegacyVitals(data.vitals),
    vital_observations: [],
    chief_complaints: lineItems(data.chiefComplaints, (row, index) => ({
      line_no: index + 1,
      complaint_text: row.complaint,
      duration_value: row.duration || null,
      duration_unit: row.durationUnit || null,
      severity: row.severity || null,
      notes: row.notes || null,
    })),
    diagnoses: lineItems(data.diagnosis, (row, index) => ({
      line_no: index + 1,
      notes: row.notes || null,
      certainty: row.certainty || null,
    })),
    medical_history: {
      smoking_status: data.medicalHistory.smokingStatus || null,
      alcohol_status: data.medicalHistory.alcoholStatus || null,
      other_notes: data.medicalHistory.historyOfPresentIllness || null,
    },
    medical_history_chronic_illnesses: data.medicalHistory.chronicIllness
      ? [
          {
            line_no: 1,
            illness_text: data.medicalHistory.chronicIllness,
            since_text: null,
            notes: null,
          },
        ]
      : [],
    medical_history_allergies: lineItems(data.allergyDetails, (row, index) => ({
      line_no: index + 1,
      allergen_text: row.allergen,
      reaction_text: row.reaction || null,
      severity: row.severity || null,
      notes: null,
    })),
    medicines: lineItems(data.medicines, (row, index) => ({
      line_no: index + 1,
      medicine_id: row.medicineId || null,
      name: row.medicine,
      medicine_type: row.dosageForm || null,
      strength: row.strength || null,
      dosage: formatMedicineDosageMan({
        morning: row.dosageMorning,
        afternoon: row.dosageAfternoon,
        night: row.dosageNight,
      }),
      duration: row.days || null,
      frequency: row.frequency || null,
      quantity: row.quantity || null,
      route: row.route || null,
      method: row.toa || null,
    })),
    ordered_tests: lineItems(data.testsRequired, (row, index) => ({
      line_no: index + 1,
      name: row.testName,
      status: row.status || 'pending',
    })),
    ordered_imaging: lineItems(data.imagingRequired, (row, index) => ({
      line_no: index + 1,
      name: row.testName,
      instructions: row.instructions || null,
      status: row.status || 'pending',
    })),
    vaccines_required: lineItems(data.immunizations, (row, index) =>
      immunizationRowToVaccinePayload(row, index + 1),
    ),
    advised_procedures: lineItems(data.procedures, (row, index) => ({
      line_no: index + 1,
      procedure_name: row.procedureName,
      advised_date: row.advisedDate || null,
    })),
    physical_activities: lineItems(data.physicalActivity, (row, index) => ({
      line_no: index + 1,
      steps_count: row.steps ? Number(row.steps) || null : null,
      sleep_duration_min: row.sleepDuration ? Number(row.sleepDuration) || null : null,
      calories_burned: row.caloriesBurned ? Number(row.caloriesBurned) || null : null,
      exercise_types: row.exerciseType ? [row.exerciseType] : [],
    })),
    care_plan: {
      advice: data.carePlan.advice || null,
      next_visit_value: data.carePlan.nextVisit ? Number(data.carePlan.nextVisit) || null : null,
      next_visit_unit: data.carePlan.nextVisitUnit || null,
      refer_to: data.carePlan.referTo || null,
    },
  };
}

export function clinicalToCreateRxFormData(
  clinical: OpdPrescriptionClinicalPayload | undefined,
): CreateRxFormData {
  const c = clinical ?? {};

  return {
    vitals: legacyVitalsToFormVitals(c.legacy_vitals as Record<string, unknown> | undefined),
    chiefComplaints:
      c.chief_complaints?.map((row) => ({
        id: crypto.randomUUID(),
        complaint: row.complaint_text,
        severity: row.severity ?? '',
        duration: row.duration_value ?? '',
        durationUnit: row.duration_unit ?? 'days',
        notes: row.notes ?? '',
      })) ?? [],
    immunizations:
      c.vaccines_required?.map((row) =>
        vaccinePayloadToImmunizationRow(row as { name: string; instructions?: string | null; due_by?: string | null }),
      ) ?? [],
    physicalActivity:
      c.physical_activities?.map((row) => ({
        id: crypto.randomUUID(),
        steps: row.steps_count != null ? String(row.steps_count) : '',
        sleepDuration: row.sleep_duration_min != null ? String(row.sleep_duration_min) : '',
        caloriesBurned: row.calories_burned != null ? String(row.calories_burned) : '',
        exerciseType: row.exercise_types?.[0] ?? '',
      })) ?? [],
    medicalHistory: {
      chronicIllness: c.medical_history_chronic_illnesses?.[0]?.illness_text ?? '',
      smokingStatus: (c.medical_history?.smoking_status as CreateRxFormData['medicalHistory']['smokingStatus']) ?? '',
      alcoholStatus:
        (c.medical_history?.alcohol_status as CreateRxFormData['medicalHistory']['alcoholStatus']) ?? '',
      dietType: '',
      historyOfPresentIllness: c.medical_history?.other_notes ?? '',
    },
    allergyDetails:
      c.medical_history_allergies?.map((row) => ({
        id: crypto.randomUUID(),
        allergen: row.allergen_text,
        reaction: row.reaction_text ?? '',
        severity: row.severity ?? '',
      })) ?? [],
    diagnosis:
      c.diagnoses?.map((row) => ({
        id: crypto.randomUUID(),
        notes: (row as { notes?: string }).notes ?? '',
        certainty: ((row as { certainty?: string }).certainty as 'confirmed' | 'presumed') ?? '',
      })) ?? [],
    medicines:
      c.medicines?.map((row) => {
        const med = row as {
          name: string;
          medicine_id?: string | null;
          medicine_type?: string;
          strength?: string;
          dosage?: string;
          duration?: string;
          frequency?: string;
          quantity?: string;
          route?: string;
          method?: string;
        };
        const dosageParts = parseMedicineDosageMan(med.dosage);
        return {
          id: crypto.randomUUID(),
          medicineId: med.medicine_id ?? '',
          medicine: med.name,
          dosageForm: med.medicine_type ?? '',
          route: med.route ?? '',
          strength: med.strength ?? '',
          dosageMorning: dosageParts.morning,
          dosageAfternoon: dosageParts.afternoon,
          dosageNight: dosageParts.night,
          days: med.duration ?? '',
          frequency: med.frequency ?? '',
          toa: med.method ?? '',
          quantity: med.quantity != null ? String(med.quantity) : '',
        };
      }) ?? [],
    testsRequired:
      c.ordered_tests?.map((row) => ({
        id: crypto.randomUUID(),
        testName: (row as { name: string }).name,
        status: (row as { status?: string }).status ?? '',
      })) ?? [],
    imagingRequired:
      c.ordered_imaging?.map((row) => ({
        id: crypto.randomUUID(),
        testName: (row as { name: string }).name,
        byWhen: '',
        instructions: (row as { instructions?: string }).instructions ?? '',
        status: (row as { status?: string }).status ?? '',
      })) ?? [],
    procedures:
      c.advised_procedures?.map((row) => ({
        id: crypto.randomUUID(),
        procedureName: (row as { procedure_name: string }).procedure_name,
        advisedDate: (row as { advised_date?: string }).advised_date ?? '',
      })) ?? [],
    carePlan: {
      advice: c.care_plan?.advice ?? '',
      referTo: c.care_plan?.refer_to ?? '',
      nextVisit: c.care_plan?.next_visit_value != null ? String(c.care_plan.next_visit_value) : '',
      nextVisitUnit: c.care_plan?.next_visit_unit ?? 'days',
    },
  };
}

export function prescriptionDetailToSession(detail: OpdPrescriptionDetail): {
  prescription_id: string;
  visit_id: string;
  patient_id: string;
  prescription_status: OpdPrescriptionDetail['status'];
  is_read_only: boolean;
  form_data: CreateRxFormData;
} {
  return {
    prescription_id: detail.id,
    visit_id: detail.visit_id,
    patient_id: detail.patient_id,
    prescription_status: detail.status,
    is_read_only: detail.status === 'final' || detail.status === 'cancelled',
    form_data: clinicalToCreateRxFormData(detail.clinical),
  };
}

export function emptyDraftFormData(): CreateRxFormData {
  return {
    vitals: {},
    chiefComplaints: [emptyComplaintRow()],
    immunizations: [emptyImmunizationRow()],
    physicalActivity: [],
    medicalHistory: {
      chronicIllness: '',
      smokingStatus: '',
      alcoholStatus: '',
      dietType: '',
      historyOfPresentIllness: '',
    },
    allergyDetails: [],
    diagnosis: [],
    medicines: [],
    testsRequired: [],
    imagingRequired: [],
    procedures: [],
    carePlan: { advice: '', referTo: '', nextVisit: '', nextVisitUnit: 'days' },
  };
}
