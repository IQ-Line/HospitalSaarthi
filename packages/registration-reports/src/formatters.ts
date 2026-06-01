export function formatDobDdMmYyyy(dateOfBirth: string | undefined | null): string {
  if (dateOfBirth == null || String(dateOfBirth).trim() === "") return "";
  const date = new Date(String(dateOfBirth));
  if (Number.isNaN(date.getTime())) return "";
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

export function formatAgeYearsFromDob(dateOfBirth: string | undefined | null): string {
  if (dateOfBirth == null || String(dateOfBirth).trim() === "") return "";
  const birth = new Date(String(dateOfBirth));
  if (Number.isNaN(birth.getTime())) return "";
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
  if (age < 0) return "";
  return `${age}y`;
}

export function formatGenderWordForOpdSlip(gender: string | undefined | null): string {
  if (gender == null || String(gender).trim() === "") return "";
  const g = String(gender).toLowerCase().trim();
  if (g === "m" || g === "male") return "male";
  if (g === "f" || g === "female") return "female";
  if (g === "o" || g === "other") return "other";
  return g;
}

export function buildOpdSlipPatientNameLine(p: {
  salutation?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  dateOfBirth?: string;
  gender?: string;
  age?: number;
}): string {
  const name = [p.salutation, p.firstName, p.middleName, p.lastName].filter(Boolean).join(" ").trim();
  const base = name || "—";
  const dobStr = formatDobDdMmYyyy(p.dateOfBirth);
  let ageStr = formatAgeYearsFromDob(p.dateOfBirth);
  if (!ageStr && typeof p.age === "number" && !Number.isNaN(p.age) && p.age >= 0) {
    ageStr = `${p.age}y`;
  }
  const genderStr = formatGenderWordForOpdSlip(p.gender);
  const inner = [dobStr, ageStr, genderStr].filter(Boolean);
  if (inner.length === 0) return base;
  return `${base} (${inner.join(", ")})`;
}

export function formatAbha(value: string | undefined | null): string {
  if (value === undefined || value === null) return "N/A";
  const s = String(value).trim();
  return s === "" ? "N/A" : s;
}

export function formatAddressForDisplay(address: string | undefined | null): string {
  if (address === undefined || address === null) return "N/A";
  const s = String(address).trim();
  return s === "" ? "N/A" : s;
}
