import type { CreateRxFormData } from '../types';
import { emptyComplaintRow, emptyImmunizationRow } from './row-factories';

function textValue(value: unknown): string {
  if (value == null) return '';
  return String(value).trim();
}

function rowHasText(...values: unknown[]): boolean {
  return values.some((v) => textValue(v).length > 0);
}

/** Drop blank table rows before sending to OPD API. */
export function sanitizeCreateRxFormDataForPersist(formData: CreateRxFormData): CreateRxFormData {
  return {
    ...formData,
    chiefComplaints: formData.chiefComplaints.filter(
      (row) => textValue(row.complaint).length > 0,
    ),
    immunizations: formData.immunizations.filter((row) =>
      rowHasText(row.vaccineName, row.manufacturer, row.lotNumber, row.notes),
    ),
    physicalActivity: formData.physicalActivity.filter((row) =>
      rowHasText(row.steps, row.sleepDuration, row.caloriesBurned, row.exerciseType),
    ),
    allergyDetails: formData.allergyDetails.filter((row) =>
      rowHasText(row.allergen, row.reaction, row.severity),
    ),
    diagnosis: formData.diagnosis.filter((row) => rowHasText(row.notes)),
    medicines: formData.medicines.filter((row) => rowHasText(row.medicine)),
    testsRequired: formData.testsRequired.filter((row) => rowHasText(row.testName)),
    imagingRequired: formData.imagingRequired.filter((row) => rowHasText(row.testName)),
    procedures: formData.procedures.filter((row) => rowHasText(row.procedureName)),
  };
}

/** Hydrate store: completed consultations show saved rows only; active visits keep one empty row to add more. */
export function prepareCreateRxFormDataForSession(
  saved: CreateRxFormData | null | undefined,
  isReadOnly: boolean,
): CreateRxFormData {
  if (!saved) {
    return {
      vitals: {},
      chiefComplaints: isReadOnly ? [] : [emptyComplaintRow()],
      immunizations: isReadOnly ? [] : [emptyImmunizationRow()],
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

  const sanitized = sanitizeCreateRxFormDataForPersist(saved);

  if (isReadOnly) {
    return {
      ...sanitized,
      chiefComplaints: sanitized.chiefComplaints,
      immunizations: sanitized.immunizations,
    };
  }

  return {
    ...sanitized,
    chiefComplaints:
      sanitized.chiefComplaints.length > 0
        ? sanitized.chiefComplaints
        : [emptyComplaintRow()],
    immunizations:
      sanitized.immunizations.length > 0 ? sanitized.immunizations : [emptyImmunizationRow()],
  };
}
