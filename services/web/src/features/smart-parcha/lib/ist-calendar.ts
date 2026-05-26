/** IST calendar-day helpers for addendum / read-only rules. */

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export function istDayKey(d: Date): string {
  return new Date(d.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

export function isSameISTCalendarDayAsNow(d: Date): boolean {
  return istDayKey(d) === istDayKey(new Date());
}
