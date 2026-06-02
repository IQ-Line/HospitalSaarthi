import type { RegistrationRecord } from "../domain/registration.types.js";
import type { VisitRecord } from "../domain/visit.types.js";

export interface RegistrationDocumentSource {
  registration: RegistrationRecord;
  visit: VisitRecord | null;
}

export function documentVisitRef(source: RegistrationDocumentSource): {
  registration_id: string;
  /** Visit UUID — use for billing / OPD API references. */
  id: string | null;
  /** Formatted visit identifier for display. */
  visit_id: string | null;
  created_at: Date;
} {
  const visit = source.visit;
  return {
    registration_id: source.registration.registration_id,
    id: visit?.id ?? null,
    visit_id: visit?.visit_id ?? null,
    created_at: visit?.created_at ?? source.registration.created_at,
  };
}
