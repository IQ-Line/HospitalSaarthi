import { describe, expect, it } from 'vitest';
import type { CreateRxFormData } from '../types';
import {
  prepareCreateRxFormDataForSession,
  sanitizeCreateRxFormDataForPersist,
} from './form-data-session';

describe('form-data-session', () => {
  it('strips empty chief complaint rows before persist', () => {
    const formData: CreateRxFormData = {
      vitals: {},
      chiefComplaints: [
        {
          id: '1',
          complaint: 'Fever',
          severity: 'mild',
          duration: '2',
          durationUnit: 'days',
          notes: '',
        },
        { id: '2', complaint: '', severity: '', duration: '', durationUnit: 'days', notes: '' },
      ],
      immunizations: [],
      physicalActivity: [],
      medicalHistory: {
        chronicIllness: '',
        smokingStatus: '',
        alcoholDrinking: '',
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

    const sanitized = sanitizeCreateRxFormDataForPersist(formData);
    expect(sanitized.chiefComplaints).toHaveLength(1);
    expect(sanitized.chiefComplaints[0]?.complaint).toBe('Fever');
  });

  it('read-only session shows saved complaints without blank starter row', () => {
    const saved: CreateRxFormData = {
      vitals: {},
      chiefComplaints: [
        {
          id: '1',
          complaint: 'Cough',
          severity: 'moderate',
          duration: '1',
          durationUnit: 'weeks',
          notes: 'dry',
        },
      ],
      immunizations: [],
      physicalActivity: [],
      medicalHistory: {
        chronicIllness: '',
        smokingStatus: '',
        alcoholDrinking: '',
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

    const prepared = prepareCreateRxFormDataForSession(saved, true);
    expect(prepared.chiefComplaints).toHaveLength(1);
    expect(prepared.chiefComplaints[0]?.complaint).toBe('Cough');
  });
});
