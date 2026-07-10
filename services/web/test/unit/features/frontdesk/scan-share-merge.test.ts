import { describe, expect, it } from 'vitest';
import { mergeScanSharePrefill } from '../../../../src/features/frontdesk/api/scan-share';
import type { CreateVisitRequestBody } from '../../../../src/features/frontdesk/types';

function baseBody(): CreateVisitRequestBody {
  return {
    patient: {
      phone: '111',
      first_name: 'Existing',
      last_name: 'Name',
      gender: 'male',
    },
    attendant: { relation: '', name: '', phone: '' },
    permanent_address: {
      line1: 'old-line',
      line2: '',
      city: 'old-city',
      state: 'old-state',
      district: 'old-district',
      pincode: '000000',
    } as CreateVisitRequestBody['permanent_address'],
    residential_address: {
      line1: 'old-res',
      line2: '',
      city: '',
      state: '',
      district: '',
      pincode: '',
    } as CreateVisitRequestBody['residential_address'],
    residential_same_as_permanent: false,
  };
}

describe('mergeScanSharePrefill', () => {
  it('overlays prefilled patient + address fields while preserving untouched ones', () => {
    const merged = mergeScanSharePrefill(baseBody(), {
      patient: { first_name: 'Asha', abha_address: 'walkin@sbx' },
      permanent_address: { city: 'new-city' } as CreateVisitRequestBody['permanent_address'],
      residential_same_as_permanent: true,
    });

    // Overlaid values win.
    expect(merged.patient.first_name).toBe('Asha');
    expect(merged.patient.abha_address).toBe('walkin@sbx');
    expect(merged.permanent_address.city).toBe('new-city');
    expect(merged.residential_same_as_permanent).toBe(true);

    // Untouched values from the current body are preserved (shallow-merged per block).
    expect(merged.patient.phone).toBe('111');
    expect(merged.patient.last_name).toBe('Name');
    expect(merged.permanent_address.line1).toBe('old-line');
    expect(merged.permanent_address.state).toBe('old-state');
    expect(merged.residential_address.line1).toBe('old-res');
  });

  it('is a pure copy — does not mutate the source body', () => {
    const original = baseBody();
    const snapshot = JSON.parse(JSON.stringify(original));
    mergeScanSharePrefill(original, { patient: { first_name: 'Changed' } });
    expect(original).toEqual(snapshot);
  });
});
