/** Picklist / legacy category values for registration rack rates. */
const REGISTRATION_CATEGORIES = new Set(["registration-fee", "registration"]);

const CONSULTATION_CATEGORIES = new Set([
  "consultation-fee",
  "consultation",
]);

export function isRegistrationTariffCategory(category: string | null | undefined): boolean {
  const c = category?.trim().toLowerCase() ?? "";
  return REGISTRATION_CATEGORIES.has(c);
}

export function isConsultationTariffCategory(category: string | null | undefined): boolean {
  const c = category?.trim().toLowerCase() ?? "";
  return CONSULTATION_CATEGORIES.has(c);
}

export function normalizeDepartmentLabel(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}
