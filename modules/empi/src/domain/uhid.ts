/**
 * UHID segment layout (immutable identifier issued at registration):
 * YYMMDD (6) + tenant numeric code TTTTT (5) + daily sequence XXXXXXX (7) → 18 chars.
 *
 * Sequence key in DB: `uhid_${YYMMDD}` — see sequence_counters + register-patient use-case.
 */

export const UHID_TOTAL_LENGTH = 18;
export const UHID_DATE_LENGTH = 6;
export const UHID_TENANT_CODE_LENGTH = 5;
export const UHID_SEQUENCE_LENGTH = 7;

export interface ParsedUhid {
  /** YYMMDD */
  dateSegment: string;
  /** Normalized 5-digit tenant numeric code */
  tenantNumericCode: string;
  /** 7-digit zero-padded daily sequence */
  sequence: string;
}

/**
 * Validates shape only (digits, lengths); does not verify tenant code exists in Configurator.
 */
export function isValidUhidFormat(uhid: string): boolean {
  if (typeof uhid !== "string" || uhid.length !== UHID_TOTAL_LENGTH) {
    return false;
  }
  if (!/^\d{18}$/.test(uhid)) return false;
  const p = parseUhid(uhid);
  return p !== null;
}

export function parseUhid(uhid: string): ParsedUhid | null {
  if (typeof uhid !== "string" || uhid.length !== UHID_TOTAL_LENGTH) {
    return null;
  }
  if (!/^\d{18}$/.test(uhid)) return null;
  return {
    dateSegment: uhid.slice(0, UHID_DATE_LENGTH),
    tenantNumericCode: uhid.slice(
      UHID_DATE_LENGTH,
      UHID_DATE_LENGTH + UHID_TENANT_CODE_LENGTH,
    ),
    sequence: uhid.slice(UHID_DATE_LENGTH + UHID_TENANT_CODE_LENGTH),
  };
}

/** Normalizes a configurator / env value to exactly 5 decimal digits. */
export function normalizeTenantNumericCode(code: string): string {
  const digits = String(code).replace(/\D/g, "");
  if (digits.length === 0) return "00000";
  return digits.slice(-UHID_TENANT_CODE_LENGTH).padStart(UHID_TENANT_CODE_LENGTH, "0");
}

export function composeUhid(
  yyMmDd: string,
  tenantNumericCode: string,
  sequence: number,
): string {
  if (yyMmDd.length !== UHID_DATE_LENGTH || !/^\d{6}$/.test(yyMmDd)) {
    throw new Error(`Invalid UHID date segment (expected YYMMDD): ${yyMmDd}`);
  }
  const t = normalizeTenantNumericCode(tenantNumericCode);
  if (!/^\d{5}$/.test(t)) {
    throw new Error(`Invalid tenant numeric code after normalize: ${t}`);
  }
  if (!Number.isInteger(sequence) || sequence < 1 || sequence > 9_999_999) {
    throw new Error(`Sequence out of range for UHID: ${sequence}`);
  }
  const seq = sequence.toString().padStart(UHID_SEQUENCE_LENGTH, "0");
  return `${yyMmDd}${t}${seq}`;
}
