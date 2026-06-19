const TZ = "Asia/Kolkata";

export function formatVisitDateTime(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(date);
  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";
  return `${pick("day")}-${pick("month")}-${pick("year")} ${pick("hour")}:${pick("minute")} ${pick("dayPeriod").toUpperCase()}`;
}

export function formatDobPart(value: string | null): string | null {
  if (!value?.trim()) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).formatToParts(date);
  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";
  return `${pick("day")}-${pick("month")}-${pick("year")}`;
}

function diffAgeParts(from: Date, at: Date): { years: number; months: number; days: number } {
  let years = at.getFullYear() - from.getFullYear();
  let months = at.getMonth() - from.getMonth();
  let days = at.getDate() - from.getDate();

  if (days < 0) {
    months -= 1;
    const prevMonth = new Date(at.getFullYear(), at.getMonth(), 0);
    days += prevMonth.getDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  return { years: Math.max(0, years), months: Math.max(0, months), days: Math.max(0, days) };
}

export function formatDobAge(
  dateOfBirth: string | null,
  yearOfBirth: number | null,
  at: Date | string,
): string {
  const reference = at instanceof Date ? at : new Date(at);
  const dobLabel = formatDobPart(dateOfBirth);
  if (dobLabel) {
    const dob = new Date(dateOfBirth ?? "");
    const { years, months, days } = diffAgeParts(dob, reference);
    return `${dobLabel}, ${years} Y (${months}M ${days}D)`;
  }
  if (yearOfBirth != null && Number.isFinite(yearOfBirth)) {
    const years = Math.max(0, reference.getFullYear() - yearOfBirth);
    return `${yearOfBirth}, ${years} Y (0M 0D)`;
  }
  return "—";
}

export function formatVisitTypeLabel(
  visitType: string | null,
  isFreeFollowUp: boolean,
): string {
  if (isFreeFollowUp) {
    return "Free Follow Up Visit";
  }
  if (!visitType?.trim()) {
    return "—";
  }
  const key = visitType.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  if (key === "opdfirst") {
    return "First Visit";
  }
  if (key === "opdfollowup") {
    return "Follow Up Visit";
  }
  return visitType.trim();
}

export function formatInr(amount: number | string): string {
  const n = typeof amount === "string" ? Number.parseFloat(amount) : amount;
  if (!Number.isFinite(n)) {
    return "₹0.00";
  }
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(n);
}

export function displayOrNa(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "N/A";
}

export function displayDoctorName(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "Not consulted";
}
