import type { ChiefComplaintRow, CreateRxFormData, CreateRxSectionTab } from '../types';

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

function rowHasAnyValue<T extends object>(row: T, fields: string[]): boolean {
  const record = row as Record<string, unknown>;
  return fields.some((field) => textValue(record[field]).length > 0);
}

function validatePartialRows<T extends { id: string }>(
  rows: T[],
  allFields: string[],
  requiredFields: string[],
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

const CHIEF_COMPLAINT_ALL_FIELDS = [
  'complaint',
  'severity',
  'duration',
  'durationUnit',
  'notes',
] as const;

const CHIEF_COMPLAINT_REQUIRED_FIELDS = [
  'complaint',
  'severity',
  'duration',
  'durationUnit',
] as const;

function hasCompleteChiefComplaint(rows: ChiefComplaintRow[]): boolean {
  return rows.some((row) => {
    if (!rowHasAnyValue(row, [...CHIEF_COMPLAINT_ALL_FIELDS])) {
      return false;
    }
    return CHIEF_COMPLAINT_REQUIRED_FIELDS.every((field) => textValue(row[field]).length > 0);
  });
}

export function visitpadCellKey(rowId: string, field: string): string {
  return `${rowId}:${field}`;
}

/**
 * Declarative table of per-section partial-row validation rules. Each entry
 * names the section's form-data key plus its "any value" and "required" field
 * lists. Keeping these as data (rather than nine inline `validatePartialRows`
 * calls) is what collapses the cognitive complexity of the orchestrator below.
 */
interface PartialRowRule {
  section: VisitpadTableSection;
  formKey: keyof CreateRxFormData;
  allFields: string[];
  requiredFields: string[];
}

const PARTIAL_ROW_RULES: PartialRowRule[] = [
  {
    section: 'chiefComplaints',
    formKey: 'chiefComplaints',
    allFields: [...CHIEF_COMPLAINT_ALL_FIELDS],
    requiredFields: [...CHIEF_COMPLAINT_REQUIRED_FIELDS],
  },
  {
    section: 'immunizations',
    formKey: 'immunizations',
    allFields: [
      'vaccineName',
      'manufacturer',
      'lotNumber',
      'dateOfDose',
      'doseNumber',
      'nextDueDate',
      'notes',
    ],
    requiredFields: ['vaccineName', 'manufacturer', 'dateOfDose'],
  },
  {
    section: 'allergyDetails',
    formKey: 'allergyDetails',
    allFields: ['allergen', 'reaction', 'severity'],
    requiredFields: ['allergen', 'reaction', 'severity'],
  },
  {
    section: 'diagnosis',
    formKey: 'diagnosis',
    allFields: ['notes', 'certainty'],
    requiredFields: ['notes', 'certainty'],
  },
  {
    section: 'medicines',
    formKey: 'medicines',
    allFields: [
      'medicine',
      'dosageForm',
      'route',
      'strength',
      'dosageMorning',
      'dosageAfternoon',
      'dosageNight',
      'days',
      'frequency',
      'toa',
      'quantity',
    ],
    requiredFields: ['medicine', 'dosageMorning', 'dosageAfternoon', 'dosageNight', 'days', 'frequency'],
  },
  {
    section: 'testsRequired',
    formKey: 'testsRequired',
    allFields: ['testName', 'status'],
    requiredFields: ['testName', 'status'],
  },
  {
    section: 'imagingRequired',
    formKey: 'imagingRequired',
    allFields: ['testName', 'byWhen', 'instructions', 'status'],
    requiredFields: ['testName', 'status'],
  },
  {
    section: 'procedures',
    formKey: 'procedures',
    allFields: ['procedureName', 'advisedDate'],
    requiredFields: ['procedureName'],
  },
  {
    section: 'physicalActivity',
    formKey: 'physicalActivity',
    allFields: ['steps', 'sleepDuration', 'caloriesBurned', 'exerciseType'],
    requiredFields: ['steps', 'sleepDuration', 'caloriesBurned', 'exerciseType'],
  },
];

function collectPartialRowErrors(formData: CreateRxFormData): VisitpadFieldError[] {
  return PARTIAL_ROW_RULES.flatMap((rule) =>
    validatePartialRows(
      formData[rule.formKey] as { id: string }[],
      rule.allFields,
      rule.requiredFields,
      rule.section,
    ),
  );
}

/**
 * "End consultation" gate: at least one chief-complaint row must be complete.
 * When none is, flag every still-missing mandatory field on the first row
 * (without duplicating errors already raised by the partial-row pass).
 */
function collectChiefComplaintGateErrors(
  formData: CreateRxFormData,
  existingErrors: VisitpadFieldError[],
): VisitpadFieldError[] {
  if (hasCompleteChiefComplaint(formData.chiefComplaints)) return [];

  const firstRow = formData.chiefComplaints[0];
  if (!firstRow) return [];

  const gateErrors: VisitpadFieldError[] = [];
  for (const field of CHIEF_COMPLAINT_REQUIRED_FIELDS) {
    if (textValue(firstRow[field])) continue;
    if (isAlreadyReported(existingErrors, 'chiefComplaints', firstRow.id, field)) continue;
    gateErrors.push({ section: 'chiefComplaints', rowId: firstRow.id, field });
  }
  return gateErrors;
}

function isAlreadyReported(
  errors: VisitpadFieldError[],
  section: VisitpadTableSection,
  rowId: string,
  field: string,
): boolean {
  return errors.some(
    (error) => error.section === section && error.rowId === rowId && error.field === field,
  );
}

function resolveFirstSectionTab(
  invalidSections: VisitpadTableSection[],
): CreateRxSectionTab | null {
  return (
    SECTION_TAB_ORDER.find((tab) =>
      invalidSections.some((section) => VISITPAD_SECTION_TAB[section] === tab),
    ) ?? null
  );
}

export function validateVisitpadForm(
  formData: CreateRxFormData,
  options?: { requireChiefComplaint?: boolean },
): VisitpadValidationResult {
  const errors = collectPartialRowErrors(formData);

  if (options?.requireChiefComplaint) {
    errors.push(...collectChiefComplaintGateErrors(formData, errors));
  }

  const invalidSections = [...new Set(errors.map((error) => error.section))];

  return {
    isValid: errors.length === 0,
    errors,
    invalidSections,
    firstSectionTab: resolveFirstSectionTab(invalidSections),
  };
}
