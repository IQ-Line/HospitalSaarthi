const MAX_SERVICE_CODE_LEN = 64;

/** Normalizes a segment for internal service_code generation (uppercase, underscores). */
export function sanitizeServiceCodeSegment(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
}

/** Billing-owned pattern: CONSULT_{TYPE}_{DEPARTMENT} */
export function buildConsultationServiceCode(
  consultationTypeCode: string,
  departmentCode: string,
): string {
  const type = sanitizeServiceCodeSegment(consultationTypeCode) || "TYPE";
  const dept = sanitizeServiceCodeSegment(departmentCode) || "DEPT";
  const code = `CONSULT_${type}_${dept}`;
  return code.length <= MAX_SERVICE_CODE_LEN ? code : code.slice(0, MAX_SERVICE_CODE_LEN);
}

export function buildConsultationServiceName(
  consultationTypeDisplayName: string,
  departmentDisplayName: string,
): string {
  return `${consultationTypeDisplayName.trim()} — ${departmentDisplayName.trim()}`;
}
