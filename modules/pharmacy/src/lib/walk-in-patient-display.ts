export function walkInPatientDisplayName(firstName: string, lastName: string | null): string {
  const parts = [firstName.trim(), lastName?.trim()].filter(
    (part): part is string => typeof part === "string" && part.length > 0,
  );
  return parts.join(" ") || "Unknown patient";
}

export function ageYearsFromDateOfBirth(dob: string | null, asOf = new Date()): number | null {
  if (!dob?.trim()) return null;
  const birth = new Date(`${dob.trim()}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return null;

  let age = asOf.getFullYear() - birth.getFullYear();
  const monthDiff = asOf.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && asOf.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age >= 0 ? age : null;
}
