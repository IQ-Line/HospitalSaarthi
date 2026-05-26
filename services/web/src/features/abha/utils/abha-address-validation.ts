/** Local-part rules for ABHA address creation (before @sbx / @abdm suffix). */
export function validateAbhaAddressLocal(value: string): string | null {
  const v = value.trim();
  if (v.length < 8) return 'Minimum length is 8 characters';
  if (v.length > 18) return 'Maximum length is 18 characters';
  if (!/^[a-zA-Z0-9._]+$/.test(v)) {
    return 'Only letters and numbers are allowed (with at most one dot and/or underscore)';
  }
  if (v.startsWith('.') || v.startsWith('_') || v.endsWith('.') || v.endsWith('_')) {
    return 'Dot/underscore must be in between (not at start or end)';
  }
  const dots = (v.match(/\./g) ?? []).length;
  const underscores = (v.match(/_/g) ?? []).length;
  if (dots > 1 || underscores > 1) {
    return 'Only one dot (.) and/or one underscore (_) is allowed';
  }
  return null;
}

export function formatMaskedMobileLast4(last4: string): string {
  const digits = last4.replace(/\D/g, '').slice(-4);
  return digits.length === 4 ? `*** *** ${digits}` : 'your registered mobile';
}

export function extractMobileLast4FromMessage(message: string): string | null {
  const masked = message.match(/\*{2,}(\d{4})/);
  if (masked?.[1]) return masked[1];
  const ending = message.match(/ending\s+(?:with\s+)?\*{0,6}(\d{4})/i);
  return ending?.[1] ?? null;
}

/** Full ABHA address (local@domain) for frontdesk verify. */
export function validateFullAbhaAddress(value: string): string | null {
  const v = value.trim();
  if (!v) return 'Enter your ABHA address';
  const at = v.indexOf('@');
  if (at <= 0 || at >= v.length - 1) {
    return 'Enter a valid ABHA address (e.g. username@sbx)';
  }
  return validateAbhaAddressLocal(v.slice(0, at));
}
