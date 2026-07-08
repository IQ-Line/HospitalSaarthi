import type { ContextNotifyHiType } from "@hims/ts-sdk-abha/protocol/m2";

const TO_GATEWAY_HI_TYPE: Record<string, ContextNotifyHiType | "Invoice"> = {
  PRESCRIPTION: "Prescription",
  OPCONSULTATION: "OPConsultation",
  DIAGNOSTICREPORT: "DiagnosticReport",
  DISCHARGESUMMARY: "DischargeSummary",
  IMMUNIZATIONRECORD: "ImmunizationRecord",
  HEALTHDOCUMENTRECORD: "HealthDocumentRecord",
  WELLNESSRECORD: "WellnessRecord",
  INVOICE: "Invoice",
};

function normalizeHiTypeKey(hiType: string): string {
  return hiType.replace(/\s+/g, "").toUpperCase();
}

/** Map ALL CAPS / loose input → PascalCase for §4.3.6 context notify. */
export function toContextNotifyHiType(hiType: string): ContextNotifyHiType {
  const key = normalizeHiTypeKey(hiType);
  const mapped = TO_GATEWAY_HI_TYPE[key];
  if (mapped && mapped !== "Invoice") return mapped;
  return "OPConsultation";
}

/**
 * Map platform input → wire value for `link/carecontext` (§4.3.3).
 * Sandbox validates PascalCase (`OPConsultation`, `Prescription`, …).
 */
export function toLinkCareContextHiType(hiType: string): string {
  const key = normalizeHiTypeKey(hiType);
  return TO_GATEWAY_HI_TYPE[key] ?? "OPConsultation";
}
