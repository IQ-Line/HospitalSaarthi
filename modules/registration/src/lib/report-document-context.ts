import type { ReportLayoutConfigResult } from "@hims/registration-reports";

/** Desk / service context passed when rendering registration documents. */
export interface ReportDocumentContext {
  bearerToken?: string;
  requestId?: string;
  /** Absolute web origin for report logo URLs in server-rendered HTML. */
  webOrigin?: string;
  logoUrl?: string;
  facilityName?: string;
  facilityId?: string;
  facilityAddress?: string;
  facilityPhone?: string;
  facilityEmail?: string;
  footerText?: string;
  departmentName?: string;
  doctorName?: string;
  roomNumber?: string;
  patientAddress?: string;
  paymentMethod?: string;
  billId?: string;
}

export function buildReportLayoutConfig(
  context: ReportDocumentContext | undefined,
  reportTitle: string,
): ReportLayoutConfigResult {
  const logo = context?.logoUrl?.trim() || "/reportLogo.svg";
  const facilityName = context?.facilityName?.trim() || "Hospital";
  const facilityId = context?.facilityId?.trim() || "—";
  const facilityAddress = context?.facilityAddress?.trim() || "";
  const facilityPhone = context?.facilityPhone?.trim() || "";
  const facilityEmail = context?.facilityEmail?.trim() || "";
  const footerText = context?.footerText?.trim() || facilityName;

  return {
    reportTitle,
    facilityName,
    facilityId,
    facilityAddress,
    facilityPhone,
    facilityEmail,
    footerText,
    logo,
    uploadedLogo: logo,
    uploadedSignature: "",
    doctorName: "",
    doctorDesignation: "",
    qualification: "",
    doctorHprId: "",
  };
}

export function splitPatientName(fullName: string): {
  firstName: string;
  middleName?: string;
  lastName: string;
} {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "—", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0]!, lastName: "" };
  return {
    firstName: parts[0]!,
    middleName: parts.length > 2 ? parts.slice(1, -1).join(" ") : undefined,
    lastName: parts[parts.length - 1]!,
  };
}

export function ageYearsFromRegistration(
  dateOfBirth: string | null,
  yearOfBirth: number | null,
): number | undefined {
  if (dateOfBirth) {
    const dob = new Date(dateOfBirth);
    if (!Number.isNaN(dob.getTime())) {
      const now = new Date();
      let age = now.getFullYear() - dob.getFullYear();
      const monthDelta = now.getMonth() - dob.getMonth();
      if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < dob.getDate())) {
        age -= 1;
      }
      return age >= 0 ? age : undefined;
    }
  }
  if (yearOfBirth != null) {
    return new Date().getFullYear() - yearOfBirth;
  }
  return undefined;
}

export function tokenNumberFromRegistrationId(registrationId: string): number {
  const hex = registrationId.replace(/-/g, "").slice(-4);
  const parsed = Number.parseInt(hex, 16);
  return Number.isFinite(parsed) && parsed > 0 ? (parsed % 10000) + 1 : 1;
}

export function formatVisitNumberForSlip(record: {
  registration_id: string;
  visit_id: string | null;
}): string {
  const shortId = record.registration_id.slice(0, 8).toUpperCase();
  return record.visit_id ? `VIS-${shortId}` : `REG-${shortId}`;
}

export function formatReceiptDateOfIssue(iso: string | Date): string {
  const date = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });
}

export function formatPaymentMethodLabel(method: string | undefined): string {
  const raw = (method ?? "").trim().toUpperCase();
  if (!raw) return "—";
  const labels: Record<string, string> = {
    CASH: "Cash",
    CARD: "Card",
    UPI: "UPI",
    CHEQUE: "Cheque",
    BANK_TRANSFER: "Bank Transfer",
  };
  return labels[raw] ?? method ?? "—";
}
