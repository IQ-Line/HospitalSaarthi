import { describe, expect, it } from 'vitest';
import type { CreateRxFormData } from '../types';
import { validateVisitpadForm } from './visitpad-validation';

const baseFormData = (): CreateRxFormData => ({
  vitals: {},
  chiefComplaints: [
    {
      id: 'c1',
      complaint: '',
      severity: '',
      duration: '',
      durationUnit: '',
      notes: '',
    },
    {
      id: 'c2',
      complaint: '',
      severity: '',
      duration: '',
      durationUnit: '',
      notes: '',
    },
  ],
  immunizations: [{ id: 'i1', vaccineName: '', manufacturer: '', lotNumber: '', dateOfDose: '', doseNumber: '', nextDueDate: '', notes: '' }],
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
});

describe('validateVisitpadForm', () => {
  it('ignores fully empty chief complaint rows', () => {
    const result = validateVisitpadForm({
      ...baseFormData(),
      chiefComplaints: [
        {
          id: 'c1',
          complaint: 'Cough',
          severity: 'mild',
          duration: '2',
          durationUnit: 'days',
          notes: '',
        },
        {
          id: 'c2',
          complaint: '',
          severity: '',
          duration: '',
          durationUnit: '',
          notes: '',
        },
      ],
    });

    expect(result.isValid).toBe(true);
  });

  it('flags missing mandatory fields on partially filled chief complaint rows', () => {
    const result = validateVisitpadForm({
      ...baseFormData(),
      chiefComplaints: [
        {
          id: 'c1',
          complaint: 'Cough',
          severity: 'mild',
          duration: '',
          durationUnit: '',
          notes: '',
        },
      ],
    });

    expect(result.isValid).toBe(false);
    expect(result.invalidSections).toContain('chiefComplaints');
    expect(result.errors.map((error) => error.field).sort()).toEqual(['duration', 'durationUnit']);
  });

  it('requires at least one complete chief complaint when ending consultation', () => {
    const result = validateVisitpadForm(baseFormData(), { requireChiefComplaint: true });

    expect(result.isValid).toBe(false);
    expect(result.invalidSections).toContain('chiefComplaints');
  });
});
