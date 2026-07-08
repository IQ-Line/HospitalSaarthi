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

/** Facility block for pdf-platform report requests. */
export interface ReportFacility {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  facilityId?: string;
  logoUrl?: string;
  footerText?: string;
}

export function buildReportFacility(context: ReportDocumentContext | undefined): ReportFacility {
  const facilityName = context?.facilityName?.trim() || "Hospital";
  return {
    name: facilityName,
    address: context?.facilityAddress?.trim() || "",
    phone: context?.facilityPhone?.trim() || "",
    email: context?.facilityEmail?.trim() || "",
    facilityId: context?.facilityId?.trim() || "—",
    logoUrl: context?.logoUrl?.trim() || "/reportLogo.svg",
    footerText: context?.footerText?.trim() || facilityName,
  };
}

export function tokenNumberFromRegistrationId(registrationId: string): number {
  const hex = registrationId.replace(/-/g, "").slice(-4);
  const parsed = Number.parseInt(hex, 16);
  return Number.isFinite(parsed) && parsed > 0 ? (parsed % 10000) + 1 : 1;
}

export function formatVisitNumberForSlip(record: {
  visit_id: string | null;
}): string {
  if (record.visit_id?.trim()) return record.visit_id.trim();
  return "—";
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
