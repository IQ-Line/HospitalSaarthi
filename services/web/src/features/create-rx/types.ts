export type CreateRxMainTab = 'visitpad' | 'documents' | 'patient-profile';

export type CreateRxRightTab = 'medical-history' | 'ai-prescription' | 'abha-consent' | 'lab-reports';

export type CreateRxSectionTab =
  | 'pre-consult'
  | 'medical-history'
  | 'current-medication'
  | 'physical-activity'
  | 'care-plan';

export interface CreateRxPatient {
  id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  gender: 'male' | 'female' | 'other';
  age: number;
  uhid: string;
  phone?: string;
  abhaNumber?: string;
  abhaAddress?: string;
}

export interface CreateRxVisit {
  id: string;
  visitNumber: string;
  status: string;
}

export interface CreateRxVisitContext {
  patient: CreateRxPatient;
  visit: CreateRxVisit;
}

import type { VitalNumericRange } from './lib/vital-range';

export type { VitalNumericRange };

export interface VitalFieldDef {
  code: string;
  label: string;
  unit?: string;
  /** Visitpad unit catalog code for the selected display unit. */
  defaultUnitCode?: string;
  placeholder?: string;
  /** Partner vital code when this row is the secondary half of a paired capture. */
  pairedWith?: string;
  /** Configured normal range from Visitpad masters, when present. */
  normalRange?: VitalNumericRange;
  /** Display label derived from `normalRange` (e.g. `90–120`). */
  rangeLabel?: string;
}

export interface ChiefComplaintRow {
  id: string;
  complaint: string;
  severity: string;
  duration: string;
  durationUnit: string;
  notes: string;
}

export interface ImmunizationRow {
  id: string;
  vaccineName: string;
  manufacturer: string;
  lotNumber: string;
  dateOfDose: string;
  doseNumber: string;
  nextDueDate: string;
  notes: string;
}

export interface PhysicalActivityRow {
  id: string;
  steps: string;
  sleepDuration: string;
  caloriesBurned: string;
  exerciseType: string;
}

export interface MedicalHistoryData {
  chronicIllness: string;
  smokingStatus: '' | 'former' | 'current' | 'never';
  alcoholStatus: '' | 'former' | 'current' | 'never';
  dietType: string;
  historyOfPresentIllness: string;
}

export interface AllergyRow {
  id: string;
  allergen: string;
  reaction: string;
  severity: string;
}

export interface DiagnosisRow {
  id: string;
  notes: string;
  certainty: '' | 'confirmed' | 'presumed';
}

export interface MedicineRow {
  id: string;
  /** Master-data visitpad medicine UUID when selected from catalog. */
  medicineId: string;
  medicine: string;
  dosageForm: string;
  route: string;
  strength: string;
  dosageMorning: string;
  dosageAfternoon: string;
  dosageNight: string;
  days: string;
  frequency: string;
  toa: string;
  quantity: string;
}

export interface TestRow {
  id: string;
  testName: string;
  status: string;
}

export interface ImagingRow {
  id: string;
  testName: string;
  byWhen: string;
  instructions: string;
  status: string;
}

export interface ProcedureRow {
  id: string;
  procedureName: string;
  advisedDate: string;
}

export interface CarePlanData {
  advice: string;
  referTo: string;
  nextVisit: string;
  nextVisitUnit: string;
}

export interface CreateRxFormData {
  vitals: Record<string, string>;
  chiefComplaints: ChiefComplaintRow[];
  immunizations: ImmunizationRow[];
  physicalActivity: PhysicalActivityRow[];
  medicalHistory: MedicalHistoryData;
  allergyDetails: AllergyRow[];
  diagnosis: DiagnosisRow[];
  medicines: MedicineRow[];
  testsRequired: TestRow[];
  imagingRequired: ImagingRow[];
  procedures: ProcedureRow[];
  carePlan: CarePlanData;
}
