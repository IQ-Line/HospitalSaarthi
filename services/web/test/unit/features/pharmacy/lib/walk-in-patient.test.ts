import { describe, expect, it } from 'vitest';
import {
  defaultWalkInPatientDraft,
  validateWalkInPatientDraft,
} from '../../../../../src/features/pharmacy/components/walk-in-patient-fields';

describe('validateWalkInPatientDraft', () => {
  it('requires first name and gender', () => {
    expect(validateWalkInPatientDraft(defaultWalkInPatientDraft())).toMatchObject({
      first_name: expect.any(String),
      gender: expect.any(String),
    });
  });

  it('accepts valid patient draft', () => {
    expect(
      validateWalkInPatientDraft({
        first_name: 'Aditya',
        last_name: 'Kumar',
        phone: '9876543210',
        gender: 'male',
        date_of_birth: '1999-03-14',
      }),
    ).toEqual({});
  });

  it('rejects invalid phone length', () => {
    expect(
      validateWalkInPatientDraft({
        ...defaultWalkInPatientDraft(),
        first_name: 'Aditya',
        gender: 'male',
        phone: '123',
      }),
    ).toMatchObject({ phone: expect.any(String) });
  });
});
