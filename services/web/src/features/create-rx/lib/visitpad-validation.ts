import type {
  AllergyRow,
  ChiefComplaintRow,
  CreateRxFormData,
  CreateRxSectionTab,
  DiagnosisRow,
  ImagingRow,
  ImmunizationRow,
  MedicineRow,
  PhysicalActivityRow,
  ProcedureRow,
  TestRow,
} from '../types';

export type VisitpadTableSection =
  | 'chiefComplaints'
  | 'immunizations'
  | 'allergyDetails'
  | 'diagnosis'
  | 'medicines'
  | 'testsRequired'
  | 'imagingRequired'
  | 'procedures'
  | 'physicalActivity';

export interface VisitpadFieldError {
  section: VisitpadTableSection;
  rowId: string;
  field: string;
}

export interface VisitpadValidationResult {
  isValid: boolean;
  errors: VisitpadFieldError[];
  invalidSections: VisitpadTableSection[];
  firstSectionTab: CreateRxSectionTab | null;
}

const SECTION_TAB_ORDER: CreateRxSectionTab[] = [
  'pre-consult',
  'medical-history',
  'current-medication',
  'physical-activity',
  'care-plan',
];

export const VISITPAD_SECTION_TAB: Record<VisitpadTableSection, CreateRxSectionTab> = {
  chiefComplaints: 'pre-consult',
  immunizations: 'pre-consult',
  allergyDetails: 'medical-history',
  diagnosis: 'current-medication',
  medicines: 'current-medication',
  testsRequired: 'current-medication',
  imagingRequired: 'current-medication',
  procedures: 'current-medication',
  physicalActivity: 'physical-activity',
};

export const VISITPAD_SECTION_LABELS: Record<VisitpadTableSection, string> = {
  chiefComplaints: 'Chief Complaints',
  immunizations: 'Immunisation Details',
  allergyDetails: 'Allergy Details',
  diagnosis: 'Diagnosis',
  medicines: 'Medications (Rx)',
  testsRequired: 'Laboratory Test',
  imagingRequired: 'Radiology Test',
  procedures: 'Procedures',
  physicalActivity: 'Physical Activity',
};

function textValue(value: unknown): string {
  if (value == null) return '';
  return String(value).trim();
}

function rowHasAnyValue(row: Record<string, unknown>, fields: string[]): boolean {
  return fields.some((field) => textValue(row[field]).length > 0);
}

function validatePartialRows<T extends { id: string }>(
  rows: T[],
  allFields: (keyof T & string)[],
  requiredFields: (keyof T & string)[],
  section: VisitpadTableSection,
): VisitpadFieldError[] {
  const errors: VisitpadFieldError[] = [];
  for (const row of rows) {
    const record = row as Record<string, unknown>;
    if (!rowHasAnyValue(record, allFields)) continue;
    for (const field of requiredFields) {
      if (!textValue(record[field])) {
        errors.push({ section, rowId: row.id, field });
      }
    }
  }
  return errors;
}

function hasCompleteChiefComplaint(rows: ChiefComplaintRow[]): boolean {
  return rows.some((row) => {
    const record = row as Record<string, unknown>;
    if (!rowHasAnyValue(record, ['complaint', 'severity', 'duration', 'durationUnit', 'notes'])) {
      return false;
    }
    return (
      textValue(row.complaint).length > 0 &&
      textValue(row.severity).length > 0 &&
      textValue(row.duration).length > 0 &&
      textValue(row.durationUnit).length > 0
    );
  });
}

export function visitpadCellKey(rowId: string, field: string): string {
  return `${rowId}:${field}`;
}

export function validateVisitpadForm(
  formData: CreateRxFormData,
  options?: { requireChiefComplaint?: boolean },
): VisitpadValidationResult {
  const errors: VisitpadFieldError[] = [
    ...validatePartialRows<ChiefComplaintRow>(
      formData.chiefComplaints,
      ['complaint', 'severity', 'duration', 'durationUnit', 'notes'],
      ['complaint', 'severity', 'duration', 'durationUnit'],
      'chiefComplaints',
    ),
    ...validatePartialRows<ImmunizationRow>(
      formData.immunizations,
      [
        'vaccineName',
        'manufacturer',
        'lotNumber',
        'dateOfDose',
        'doseNumber',
        'nextDueDate',
        'notes',
      ],
      ['vaccineName', 'manufacturer', 'dateOfDose'],
      'immunizations',
    ),
    ...validatePartialRows<AllergyRow>(
      formData.allergyDetails,
      ['allergen', 'reaction', 'severity'],
      ['allergen', 'reaction', 'severity'],
      'allergyDetails',
    ),
    ...validatePartialRows<DiagnosisRow>(
      formData.diagnosis,
      ['notes', 'certainty'],
      ['notes', 'certainty'],
      'diagnosis',
    ),
    ...validatePartialRows<MedicineRow>(
      formData.medicines,
      ['medicine', 'dosageForm', 'route', 'strength', 'dosage', 'days', 'frequency', 'quantity'],
      ['medicine', 'dosage', 'days', 'frequency'],
      'medicines',
    ),
    ...validatePartialRows<TestRow>(
      formData.testsRequired,
      ['testName', 'status'],
      ['testName', 'status'],
      'testsRequired',
    ),
    ...validatePartialRows<ImagingRow>(
      formData.imagingRequired,
      ['testName', 'byWhen', 'instructions', 'status'],
      ['testName', 'status'],
      'imagingRequired',
    ),
    ...validatePartialRows<ProcedureRow>(
      formData.procedures,
      ['procedureName', 'advisedDate'],
      ['procedureName'],
      'procedures',
    ),
    ...validatePartialRows<PhysicalActivityRow>(
      formData.physicalActivity,
      ['steps', 'sleepDuration', 'caloriesBurned', 'exerciseType'],
      ['steps', 'sleepDuration', 'caloriesBurned', 'exerciseType'],
      'physicalActivity',
    ),
  ];

  if (options?.requireChiefComplaint && !hasCompleteChiefComplaint(formData.chiefComplaints)) {
    const firstRow = formData.chiefComplaints[0];
    if (firstRow) {
      for (const field of ['complaint', 'severity', 'duration', 'durationUnit'] as const) {
        if (!textValue(firstRow[field])) {
          const alreadyReported = errors.some(
            (error) =>
              error.section === 'chiefComplaints' &&
              error.rowId === firstRow.id &&
              error.field === field,
          );
          if (!alreadyReported) {
            errors.push({
              section: 'chiefComplaints',
              rowId: firstRow.id,
              field,
            });
          }
        }
      }
    }
  }

  const invalidSections = [...new Set(errors.map((error) => error.section))];
  const firstSectionTab =
    SECTION_TAB_ORDER.find((tab) =>
      invalidSections.some((section) => VISITPAD_SECTION_TAB[section] === tab),
    ) ?? null;

  return {
    isValid: errors.length === 0,
    errors,
    invalidSections,
    firstSectionTab,
  };
}
