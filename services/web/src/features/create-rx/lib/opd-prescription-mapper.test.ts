import { describe, expect, it } from 'vitest';
import {
  immunizationRowToVaccinePayload,
  vaccinePayloadToImmunizationRow,
} from './opd-immunization-meta';
import { formVitalsToLegacyVitals, legacyVitalsToFormVitals } from './opd-legacy-vitals';
import { clinicalToCreateRxFormData, createRxFormDataToClinical } from './opd-prescription-mapper';
import type { CreateRxFormData } from '../types';

describe('opd immunization meta', () => {
  it('round-trips manufacturer, lot, and dates via instructions and due_by', () => {
    const row = {
      id: '1',
      vaccineName: 'Ebola vaccine',
      manufacturer: 'Acme Labs',
      lotNumber: 'LOT-99',
      dateOfDose: '2026-06-01',
      doseNumber: '2',
      nextDueDate: '2026-12-01',
      notes: 'Left arm',
    };

    const payload = immunizationRowToVaccinePayload(row, 1);
    expect(payload.due_by).toBeTruthy();
    expect(payload.instructions).toContain('__hims_immunization_v1:');

    const restored = vaccinePayloadToImmunizationRow({
      name: payload.name,
      instructions: payload.instructions,
      due_by: payload.due_by,
    });

    expect(restored.vaccineName).toBe('Ebola vaccine');
    expect(restored.manufacturer).toBe('Acme Labs');
    expect(restored.lotNumber).toBe('LOT-99');
    expect(restored.dateOfDose).toBe('2026-06-01');
    expect(restored.doseNumber).toBe('2');
    expect(restored.nextDueDate).toBe('2026-12-01');
    expect(restored.notes).toBe('Left arm');
  });
});

describe('opd legacy vitals', () => {
  it('maps form codes to API keys and back', () => {
    const legacy = formVitalsToLegacyVitals({
      systolic_bp: '120',
      respiratory_rate: '19',
      bmi: '24',
    });
    expect(legacy).toEqual({
      bp_systolic: 120,
      respiratory_rate: 19,
      bmi: 24,
    });

    const form = legacyVitalsToFormVitals(legacy);
    expect(form.systolic_bp).toBe('120');
    expect(form.respiratory_rate).toBe('19');
    expect(form.bmi).toBe('24');
  });
});

describe('medicine prescription mapping', () => {
  it('maps dosage form, M-A-N dosage, frequency, route, and TOA to clinical payload', () => {
    const formData: CreateRxFormData = {
      vitals: {},
      chiefComplaints: [],
      immunizations: [],
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
      medicines: [
        {
          id: '1',
          medicine: 'Paracetamol',
          dosageForm: 'Tablet',
          route: 'Oral',
          strength: '500mg',
          dosageMorning: '1',
          dosageAfternoon: '0',
          dosageNight: '1',
          days: '5',
          frequency: 'Once Daily',
          toa: 'After Meals',
          quantity: '10',
        },
      ],
      testsRequired: [],
      imagingRequired: [],
      procedures: [],
      carePlan: { advice: '', referTo: '', nextVisit: '', nextVisitUnit: 'days' },
    };

    const clinical = createRxFormDataToClinical(formData);
    expect(clinical.medicines?.[0]).toEqual({
      line_no: 1,
      name: 'Paracetamol',
      medicine_type: 'Tablet',
      strength: '500mg',
      dosage: '1-0-1',
      duration: '5',
      frequency: 'Once Daily',
      quantity: '10',
      route: 'Oral',
      method: 'After Meals',
    });

    const restored = clinicalToCreateRxFormData(clinical);
    expect(restored.medicines[0]).toMatchObject({
      medicine: 'Paracetamol',
      dosageForm: 'Tablet',
      route: 'Oral',
      strength: '500mg',
      dosageMorning: '1',
      dosageAfternoon: '0',
      dosageNight: '1',
      days: '5',
      frequency: 'Once Daily',
      toa: 'After Meals',
      quantity: '10',
    });
  });
});

describe('createRxFormDataToClinical', () => {
  it('includes immunization meta in vaccines_required', () => {
    const formData: CreateRxFormData = {
      vitals: {},
      chiefComplaints: [],
      immunizations: [
        {
          id: '1',
          vaccineName: 'BCG',
          manufacturer: 'Bio',
          lotNumber: '1',
          dateOfDose: '2026-01-01',
          doseNumber: '1',
          nextDueDate: '2027-01-01',
          notes: '',
        },
      ],
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

    const clinical = createRxFormDataToClinical(formData);
    const vaccine = clinical.vaccines_required?.[0] as {
      instructions?: string;
      due_by?: string;
    };
    expect(vaccine.instructions).toContain('__hims_immunization_v1:');
    expect(vaccine.due_by).toBeTruthy();

    const restored = clinicalToCreateRxFormData(clinical);
    expect(restored.immunizations[0]?.manufacturer).toBe('Bio');
    expect(restored.immunizations[0]?.nextDueDate).toBe('2027-01-01');
  });
});
