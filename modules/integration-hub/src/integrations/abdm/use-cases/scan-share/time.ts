/**
 * Pure IST day/window helpers for scan-and-share. Every function takes an
 * explicit `now` so use-cases can inject a fixed clock in tests. The values
 * (60-minute active window, IST issue date, end-of-IST-day expiry) mirror the
 * legacy abdi-lims-backed behaviour exactly.
 */

export const ACTIVE_WINDOW_MS = 60 * 60 * 1000;

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** IST calendar date (`YYYY-MM-DD`) that a token is issued/looked-up under. */
export function istIssueDate(now: Date): string {
  return new Date(now.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** End of the current IST day — the issuance `expires_at`. */
export function endOfIstDay(now: Date): Date {
  return new Date(`${istIssueDate(now)}T23:59:59.999+05:30`);
}

/** Start of the active window: issuances older than this are excluded. */
export function activeWindowSince(now: Date): Date {
  return new Date(now.getTime() - ACTIVE_WINDOW_MS);
}
