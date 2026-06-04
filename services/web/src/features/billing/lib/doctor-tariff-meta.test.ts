import { describe, expect, it } from 'vitest';
import { decodeDoctorTariffDescription, encodeDoctorTariffDescription } from './doctor-tariff-meta';

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
});
