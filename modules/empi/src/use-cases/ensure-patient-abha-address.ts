import type { EventBus } from "@hims/ts-sdk-events";
import type { IdentifierRepo } from "../ports.js";
import type { PatientIdentifier } from "../domain/patient.types.js";
import { linkIdentifier } from "./link-identifier.js";

interface Deps {
  identifierRepo: IdentifierRepo;
  eventBus: EventBus;
}

export type EnsurePatientAbhaAddressResult =
  | { status: "linked"; identifier: PatientIdentifier }
  | { status: "already_linked" }
  | { status: "conflict"; existingPatientId: string };

export async function ensurePatientAbhaAddress(
  deps: Deps,
  tenantId: string,
  patientId: string,
  abhaAddress: string,
  createdBy?: string | null,
): Promise<EnsurePatientAbhaAddressResult> {
  const value = abhaAddress.trim();
  if (!value) return { status: "already_linked" };

  const existingPatientId = await deps.identifierRepo.findActivePatientIdByIdentifier(
    tenantId,
    "abha_address",
    value,
  );

  if (existingPatientId === patientId) {
    return { status: "already_linked" };
  }
  if (existingPatientId) {
    return { status: "conflict", existingPatientId };
  }

  const identifier = await linkIdentifier(deps, {
    iq_tenant_id: tenantId,
    patient_id: patientId,
    identifier_type: "abha_address",
    identifier_value: value,
    issuing_system: "abdm",
    created_by: createdBy ?? null,
  });

  return { status: "linked", identifier };
}
