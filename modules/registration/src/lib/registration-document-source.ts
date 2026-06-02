import type { RegistrationRecord } from "../domain/registration.types.js";
import type { VisitRecord } from "../domain/visit.types.js";

export interface RegistrationDocumentSource {
  registration: RegistrationRecord;
  visit: VisitRecord | null;
}

export function documentVisitRef(source: RegistrationDocumentSource): {
  registration_id: string;
  visit_id: string | null;
  created_at: Date;
} {
  const visit = source.visit;
  return {
    registration_id: source.registration.registration_id,
    visit_id: visit?.visit_id ?? null,
    created_at: visit?.created_at ?? source.registration.created_at,
  };
}
