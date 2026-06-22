import { describe, expect, it } from 'vitest';
import {
  decodeDoctorTariffDescription,
  encodeDoctorTariffDescription,
  formatDoctorTariffMetaSummary,
  isDoctorTariffMetadataDescription,
  userVisibleTariffDescription,
} from '../../../../../src/features/billing/lib/doctor-tariff-meta';

describe('doctor-tariff-meta', () => {
  it('round-trips room and OPD days', () => {
    const encoded = encodeDoctorTariffDescription({
      room_number: '12A',
      opd_days: ['mon', 'wed'],
    });
    expect(encoded).toBeTruthy();
    expect(decodeDoctorTariffDescription(encoded)).toEqual({
      room_number: '12A',
      opd_days: ['mon', 'wed'],
    });
  });

  it('returns empty meta for blank description', () => {
    expect(decodeDoctorTariffDescription(null)).toEqual({ room_number: '', opd_days: [] });
    expect(encodeDoctorTariffDescription({ room_number: '', opd_days: [] })).toBeNull();
  });

  it('detects encoded doctor metadata vs user text', () => {
    const encoded = encodeDoctorTariffDescription({
      room_number: '42',
      opd_days: ['mon', 'sat'],
    });
    expect(isDoctorTariffMetadataDescription(encoded)).toBe(true);
    expect(userVisibleTariffDescription(encoded)).toBeNull();
    expect(userVisibleTariffDescription('Front desk note')).toBe('Front desk note');
    expect(formatDoctorTariffMetaSummary(decodeDoctorTariffDescription(encoded))).toBe(
      'Room 42 · OPD Mon, Sat',
    );
  });
});
