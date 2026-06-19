import { describe, expect, it } from 'vitest';
import {
  formatQueuedDateRangeLabel,
  parseLocalIsoDate,
  pickerRangeToQueuedDates,
  queuedDatesToPickerRange,
} from './pharmacy-queue-date-range';

describe('pharmacy-queue-date-range', () => {
  it('round-trips queued dates through picker range', () => {
    const range = queuedDatesToPickerRange({ queued_from: '2026-06-01', queued_to: '2026-06-05' });
    expect(range?.from?.getFullYear()).toBe(2026);
    expect(range?.to?.getDate()).toBe(5);

    expect(pickerRangeToQueuedDates(range)).toEqual({
      queued_from: '2026-06-01',
      queued_to: '2026-06-05',
    });
  });

  it('formats range label for display', () => {
    expect(
      formatQueuedDateRangeLabel({ queued_from: '2026-06-01', queued_to: '2026-06-05' }),
    ).toContain('2026');
  });

  it('rejects invalid iso dates', () => {
    expect(parseLocalIsoDate('not-a-date')).toBeUndefined();
  });
});
