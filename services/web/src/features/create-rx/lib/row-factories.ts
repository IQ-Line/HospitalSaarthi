export function newRowId(): string {
  return crypto.randomUUID();
}
import type {
  AllergyRow,
  ChiefComplaintRow,
  DiagnosisRow,
  ImagingRow,
  ImmunizationRow,
  MedicineRow,
  PhysicalActivityRow,
  ProcedureRow,
  TestRow,
} from '../types';

export function emptyComplaintRow(): ChiefComplaintRow {
  return { id: newRowId(), complaint: '', severity: '', duration: '', durationUnit: '', notes: '' };
}

export function emptyImmunizationRow(): ImmunizationRow {
  return {
    id: newRowId(),
    vaccineName: '',
    manufacturer: '',
    lotNumber: '',
    dateOfDose: '',
    doseNumber: '',
    nextDueDate: '',
    notes: '',
  };
}

export function emptyPhysicalActivityRow(): PhysicalActivityRow {
  return { id: newRowId(), steps: '', sleepDuration: '', caloriesBurned: '', exerciseType: '' };
}

export function emptyAllergyRow(): AllergyRow {
  return { id: newRowId(), allergen: '', reaction: '', severity: '' };
}

export function emptyDiagnosisRow(): DiagnosisRow {
  return { id: newRowId(), notes: '', certainty: '' };
}

export function emptyMedicineRow(): MedicineRow {
  return {
    id: newRowId(),
    medicineId: '',
    medicine: '',
    dosageForm: '',
    route: '',
    strength: '',
    dosageMorning: '',
    dosageAfternoon: '',
    dosageNight: '',
    days: '0',
    frequency: '',
    toa: '',
    quantity: '',
  };
}

export function emptyTestRow(): TestRow {
  return { id: newRowId(), testName: '', status: '' };
}

export function emptyImagingRow(): ImagingRow {
  return { id: newRowId(), testName: '', byWhen: '', instructions: '', status: '' };
}

export function emptyProcedureRow(): ProcedureRow {
  return { id: newRowId(), procedureName: '', advisedDate: '' };
}
