import { describe, expect, it } from 'vitest';
import { formatEmpiAddressForDisplay, formatPatientAddressForReport } from '../../../../../src/features/frontdesk/utils/report-address';

describe('formatEmpiAddressForDisplay', () => {
  it('resolves state and district codes to names', () => {
    const formatted = formatEmpiAddressForDisplay({
      street: '123 MG Road',
      state: '29',
      district: '525',
      pincode: '560001',
    });

    expect(formatted).toContain('123 MG Road');
    expect(formatted).toContain('Karnataka');
    expect(formatted).toContain('Bengaluru Urban');
    expect(formatted).toContain('560001');
    expect(formatted).not.toContain('29');
    expect(formatted).not.toContain('525');
  });
});

describe('formatPatientAddressForReport', () => {
  it('formats registration address block like HIMS reports', () => {
    const formatted = formatPatientAddressForReport({
      line1: 'House 12, Sector 4',
      line2: '',
      city: '',
      state: '9',
      district: '118',
      pincode: '201301',
    });

    expect(formatted).toContain('House 12, Sector 4');
    expect(formatted).toContain('Uttar Pradesh');
    expect(formatted).toContain('201301');
  });
});
