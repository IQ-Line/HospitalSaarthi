import type { PatientStatus } from "./patient.types.js";

/**
 * Allowed patient status transitions (terminal `deceased` cannot be reversed).
 * Pattern mirrors Configurator provisioning guards (explicit adjacency map).
 */
export const ALLOWED_PATIENT_STATUS_TRANSITIONS: Record<
  PatientStatus,
  readonly PatientStatus[]
> = {
  active: ["inactive", "deceased"],
  inactive: ["active", "deceased"],
  deceased: [],
} as const;

export function isAllowedPatientStatusTransition(
  from: PatientStatus,
  to: PatientStatus,
): boolean {
  if (from === to) return true;
  const allowed = ALLOWED_PATIENT_STATUS_TRANSITIONS[from];
  return allowed.includes(to);
}
