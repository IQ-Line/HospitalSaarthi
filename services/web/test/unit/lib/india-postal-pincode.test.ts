import { describe, expect, it } from 'vitest';
import {
  mapPostOfficeToAddressFields,
  matchIndianStateOption,
  sanitizeIndianPincodeInput,
} from '../../../src/lib/india-postal-pincode';

const STATE_OPTIONS = [
  { value: 'Delhi', label: 'Delhi' },
  { value: 'Jammu and Kashmir', label: 'Jammu and Kashmir' },
  { value: 'Odisha', label: 'Odisha' },
] as const;

describe('sanitizeIndianPincodeInput', () => {
  it('keeps only up to 6 digits', () => {
    expect(sanitizeIndianPincodeInput('11a0001x')).toBe('110001');
    expect(sanitizeIndianPincodeInput('1234567890')).toBe('123456');
  });
});

describe('matchIndianStateOption', () => {
  it('maps postal API state names to wizard options', () => {
    expect(matchIndianStateOption('Delhi', STATE_OPTIONS)).toBe('Delhi');
    expect(matchIndianStateOption('Jammu & Kashmir', STATE_OPTIONS)).toBe('Jammu and Kashmir');
    expect(matchIndianStateOption('Orissa', STATE_OPTIONS)).toBe('Odisha');
  });
});

describe('mapPostOfficeToAddressFields', () => {
  it('maps post office fields and ignores NA values', () => {
    expect(
      mapPostOfficeToAddressFields(
        {
          Name: 'Connaught Place',
          Block: 'New Delhi',
          District: 'Central Delhi',
          State: 'Delhi',
        },
        STATE_OPTIONS,
      ),
    ).toEqual({
      locality: 'Connaught Place',
      block: 'New Delhi',
      district: 'Central Delhi',
      state: 'Delhi',
    });
  });
});
