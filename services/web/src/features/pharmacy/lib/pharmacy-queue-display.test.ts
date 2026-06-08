import { describe, expect, it } from 'vitest';
import {
  formatDoctorDisplay,
  formatRxNumber,
  matchesPharmacyQueueSearch,
  matchesPharmacyQueueStatus,
} from './pharmacy-queue-display';
import type { PharmacyQueueItem } from '../types';

const row: PharmacyQueueItem = {
  walk_in_order: false,
  record_id: null,
  visit_id: 'b1111111-1111-4111-8111-111111111101',
  patient_id: 'a1111111-1111-4111-8111-111111111101',
  walk_in_patient_id: null,
  prescription_id: 'c1111111-1111-4111-8111-111111111101',
  doctor_id: 'd1111111-1111-4111-8111-111111111101',
  visit_status: 'completed',
  prescription_status: 'final',
  updated_at: '2026-06-04T05:41:20.369726Z',
  finalized_at: '2026-06-04T05:41:20.369726Z',
  medicine_count: 2,
  patient_name: 'Jane Doe',
  uhid: '123456789012345678',
  phone: null,
  age_years: 33,
  gender: 'female',
  doctor_name: 'Dr. Demo DoctorOne',
  has_dispense: false,
};

describe('pharmacy-queue-display', () => {
  it('formats Rx number from prescription id', () => {
    expect(formatRxNumber(row.prescription_id)).toMatch(/^RX-/);
  });

  it('formats doctor display name with fallback', () => {
    expect(formatDoctorDisplay(row)).toBe('Dr. Demo DoctorOne');
    expect(formatDoctorDisplay({ ...row, doctor_name: null })).toBe('d1111111');
    expect(formatDoctorDisplay({ ...row, doctor_name: null, doctor_id: null })).toBe('—');
  });

  it('filters by pending status', () => {
    expect(matchesPharmacyQueueStatus(row, 'pending')).toBe(true);
    expect(matchesPharmacyQueueStatus({ ...row, has_dispense: true }, 'pending')).toBe(false);
  });

  it('matches search on patient name and uhid', () => {
    expect(matchesPharmacyQueueSearch(row, 'jane')).toBe(true);
    expect(matchesPharmacyQueueSearch(row, '1234567890')).toBe(true);
    expect(matchesPharmacyQueueSearch(row, 'missing')).toBe(false);
  });
});
