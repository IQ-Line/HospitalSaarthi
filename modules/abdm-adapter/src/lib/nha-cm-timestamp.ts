/** NHA CM expects `yyyy-MM-dd'T'HH:mm:ss.SSS'Z'` (see consent init validation errors). */
export function formatNhaCmTimestamp(iso: string): string {
  const ms = new Date(iso).getTime();
  if (Number.isNaN(ms)) {
    throw new Error(`Invalid date: ${iso}`);
  }
  return new Date(ms).toISOString();
}

function isUtcMidnightEnd(iso: string): boolean {
  return formatNhaCmTimestamp(iso).endsWith("T00:00:00.000Z");
}

/**
 * CM excludes care contexts with `dateCreated` after `dateRange.to`. Midnight UTC (`T00:00:00.000Z`)
 * on a day drops visits linked later that day — PHR shows empty links and Grant stays disabled.
 * Bump past midnight `to` to now so same-day linked contexts stay in range.
 */
export function normalizeConsentPermissionDateRange(dateRange: {
  from: string;
  to: string;
}): { from: string; to: string; adjustedToFromMidnight: boolean } {
  if (!isUtcMidnightEnd(dateRange.to)) {
    return { from: dateRange.from, to: dateRange.to, adjustedToFromMidnight: false };
  }
  const toMs = new Date(dateRange.to).getTime();
  const nowMs = Date.now();
  if (Number.isNaN(toMs) || toMs > nowMs) {
    return { from: dateRange.from, to: dateRange.to, adjustedToFromMidnight: false };
  }
  return {
    from: dateRange.from,
    to: new Date(nowMs).toISOString(),
    adjustedToFromMidnight: true,
  };
}

/**
 * Sandbox consent init rejects future `dateRange.to` and non-millisecond timestamps.
 */
export function validateConsentPermissionDateRange(dateRange: {
  from: string;
  to: string;
}): void {
  const fromMs = new Date(dateRange.from).getTime();
  const toMs = new Date(dateRange.to).getTime();
  if (Number.isNaN(fromMs) || Number.isNaN(toMs)) {
    throw new Error("dateRange.from and dateRange.to must be valid ISO-8601 dates");
  }
  if (fromMs >= toMs) {
    throw new Error("dateRange.from must be before dateRange.to");
  }
  if (toMs > Date.now() + 60_000) {
    throw new Error(
      "dateRange.to must be today or earlier in UTC (NHA rejects a future end date). " +
        "Use current UTC time for today, not midnight (T00:00:00.000Z), which excludes care contexts linked later that day.",
    );
  }
}
