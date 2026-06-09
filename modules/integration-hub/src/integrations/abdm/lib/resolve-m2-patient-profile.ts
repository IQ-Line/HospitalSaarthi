import type { AbdmAdapterDeps } from "../ports.js";
import type { M2PatientProfile } from "../ports.js";

/** EMPI identifiers first; registration snapshot when desk captured ABHA at intake. */
export async function resolveM2PatientProfile(
  deps: Pick<AbdmAdapterDeps, "empi" | "registration">,
  input: { iqTenantId: string; patientId: string },
): Promise<M2PatientProfile | null> {
  const fromEmpi = await deps.empi.findM2PatientProfile(input);
  if (fromEmpi) return fromEmpi;
  return deps.registration.findM2PatientProfile(input);
}
