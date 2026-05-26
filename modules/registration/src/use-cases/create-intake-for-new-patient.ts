import type { EventBus } from "@hims/ts-sdk-events";
import type { EmpiHttpPort, RegistrationRepo } from "../ports.js";
import type {
  InsertRegistrationResult,
  NewPatientIntakeInput,
  PatientDemographicsSnapshot,
} from "../domain/registration.types.js";
import {
  createRegistration,
  type CreateRegistrationContext,
} from "./create-registration.js";
import { registrationStatusFromIntakeCompletion } from "../lib/registration-helpers.js";

export async function createIntakeForNewPatient(
  deps: {
    registrationRepo: RegistrationRepo;
    empiGateway: EmpiHttpPort;
    eventBus: EventBus;
  },
  tenantId: string,
  input: NewPatientIntakeInput,
  ctx: CreateRegistrationContext & { bearerToken?: string },
): Promise<
  | { ok: true; result: InsertRegistrationResult }
  | {
      ok: false;
      kind: "duplicate";
      body: {
        code: string;
        message: string;
        patient_id: string;
        patient_snapshot: PatientDemographicsSnapshot;
      };
    }
  | { ok: false; kind: "empi_error"; status: number; body: string }
  | { ok: false; kind: "empi_unavailable"; status: number; body: string }
> {
  const existing = await deps.registrationRepo.findByIdempotencyKey(
    tenantId,
    ctx.idempotencyKey,
  );
  if (existing) {
    return { ok: true, result: { record: existing, created: false } };
  }

  const empiResult = await deps.empiGateway.registerPatient(
    tenantId,
    ctx.idempotencyKey,
    input.patient,
    ctx.bearerToken,
  );

  if (!empiResult.ok) {
    if (empiResult.kind === "duplicate") {
      if (empiResult.existingPatientId) {
        return {
          ok: false,
          kind: "duplicate",
          body: {
            code: "patient_already_exists",
            message: "Patient already exists.",
            patient_id: empiResult.existingPatientId,
            patient_snapshot: empiResult.snapshot,
          },
        };
      }
      return {
        ok: false,
        kind: "empi_error",
        status: 409,
        body:
          typeof empiResult.body === "string"
            ? empiResult.body
            : JSON.stringify(empiResult.body ?? "EMPI duplicate response unrecognised"),
      };
    }
    if (empiResult.kind === "empi_unavailable") {
      return {
        ok: false,
        kind: "empi_unavailable",
        status: empiResult.status,
        body: empiResult.body,
      };
    }
    return {
      ok: false,
      kind: "empi_error",
      status: empiResult.status,
      body: empiResult.body,
    };
  }

  const result = await createRegistration(
    deps,
    tenantId,
    {
      patient_id: empiResult.patientId,
      patient_source_record_id: empiResult.sourceRecordId,
      patient_snapshot: empiResult.snapshot,
      facility_id: input.facility_id,
      visit_type: input.visit_type,
      department_id: input.department_id,
      provider_id: input.provider_id,
      appointment_id: input.appointment_id,
      intake_completion: input.intake_completion,
    },
    {
      ...ctx,
      initialStatus:
        ctx.initialStatus ??
        registrationStatusFromIntakeCompletion(input.intake_completion ?? "partial"),
    },
  );

  return { ok: true, result };
}
