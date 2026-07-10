import { describe, expect, it } from 'vitest';
import { formatMedicineDosageMan, parseMedicineDosageMan } from '../../../../../src/features/create-rx/lib/medicine-dosage';

describe('medicine-dosage', () => {
  it('parses legacy M-A-N dosage strings', () => {
    expect(parseMedicineDosageMan('1-0-1')).toEqual({
      morning: '1',
      afternoon: '0',
      night: '1',
    });
  });

  it('formats M-A-N parts into legacy dosage strings', () => {
    expect(
      formatMedicineDosageMan({
        morning: '1',
        afternoon: '',
        night: '2',
      }),
    ).toBe('1-0-2');
  });

  it('returns null when all dosage parts are empty', () => {
    expect(
      formatMedicineDosageMan({
        morning: '',
        afternoon: '',
        night: '',
      }),
    ).toBeNull();
  });
});
