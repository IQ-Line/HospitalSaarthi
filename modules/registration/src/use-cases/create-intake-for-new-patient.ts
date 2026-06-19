import type { EventBus } from "@hims/ts-sdk-events";
import type { EmpiHttpPort, OpdHttpPort, RegistrationRepo, VisitRepo, ConfiguratorHttpPort } from "../ports.js";
import type {
  ExistingPatientVisitInput,
  NewPatientIntakeInput,
  PatientDemographicsSnapshot,
  RegistrationRecord,
  RegistrationWithVisitRecord,
} from "../domain/registration.types.js";
import type { VisitRecord } from "../domain/visit.types.js";
import { createRegistration } from "./create-registration.js";
import { createVisit } from "./create-visit.js";
import {
  abhaAddressFromIntake,
  mapEmpiPatientToSnapshot,
  mapRegistrationAddressToEmpiBody,
  mergeIntakeIntoSnapshot,
  stripNonEmpiIntakeFields,
} from "../lib/registration-helpers.js";
import { visitStatusFromIntakeCompletion } from "../lib/visit-helpers.js";

export type IntakeContext = {
  idempotencyKey: string;
  actorId: string;
  bearerToken?: string;
};

export async function createIntakeForNewPatient(
  deps: {
    registrationRepo: RegistrationRepo;
    visitRepo: VisitRepo;
    empiGateway: EmpiHttpPort;
    eventBus: EventBus;
    allocateOpVisitId: (tenantId: string) => Promise<string>;
    opdGateway?: OpdHttpPort;
    configuratorGateway?: ConfiguratorHttpPort;
  },
  tenantId: string,
  input: NewPatientIntakeInput,
  ctx: IntakeContext,
): Promise<
  | { ok: true; result: RegistrationWithVisitRecord; created: boolean }
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
  const existingVisit = await deps.visitRepo.findByIdempotencyKey(
    tenantId,
    ctx.idempotencyKey,
  );
  if (existingVisit) {
    const registration =
      (await deps.registrationRepo.findByIdempotencyKey(tenantId, ctx.idempotencyKey)) ??
      (await deps.registrationRepo.findByPatientId(tenantId, existingVisit.patient_id));
    return {
      ok: true,
      result: { registration: registration ?? null, visit: existingVisit },
      created: false,
    };
  }

  const empiAddress = mapRegistrationAddressToEmpiBody(input.permanent_address);
  const empiResult = await deps.empiGateway.registerPatient(
    tenantId,
    ctx.idempotencyKey,
    {
      ...stripNonEmpiIntakeFields(input.patient),
      ...(empiAddress ? { address: empiAddress } : {}),
    },
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

  const registrationResult = await createRegistration(
    deps,
    tenantId,
    {
      patient_id: empiResult.patientId,
      patient_source_record_id: empiResult.sourceRecordId,
      patient_snapshot: mergeIntakeIntoSnapshot(empiResult.snapshot, input.patient),
    },
    ctx,
  );

  const abhaAddress = abhaAddressFromIntake(input.patient);
  if (abhaAddress) {
    await deps.empiGateway.linkAbhaAddress(
      tenantId,
      empiResult.patientId,
      abhaAddress,
      ctx.actorId,
      ctx.bearerToken,
    );
  }

  const visitResult = await createVisit(
    deps,
    tenantId,
    {
      patient_id: empiResult.patientId,
      facility_id: input.facility_id,
      visit_type: input.visit_type,
      consultation_type: input.consultation_type,
      department_id: input.department_id,
      doctor_id: input.doctor_id,
      appointment_id: input.appointment_id,
      intake_completion: input.intake_completion,
    },
    {
      idempotencyKey: ctx.idempotencyKey,
      actorId: ctx.actorId,
      bearerToken: ctx.bearerToken,
      initialStatus: visitStatusFromIntakeCompletion(input.intake_completion ?? "partial"),
    },
  );

  return {
    ok: true,
    result: {
      registration: registrationResult.record,
      visit: visitResult.record,
    },
    created: registrationResult.created || visitResult.created,
  };
}

export async function createVisitForExistingPatient(
  deps: {
    registrationRepo: RegistrationRepo;
    visitRepo: VisitRepo;
    empiGateway: EmpiHttpPort;
    allocateOpVisitId: (tenantId: string) => Promise<string>;
    eventBus: EventBus;
    opdGateway?: OpdHttpPort;
    configuratorGateway?: ConfiguratorHttpPort;
  },
  tenantId: string,
  input: ExistingPatientVisitInput,
  ctx: IntakeContext,
): Promise<{ visit: VisitRecord; registration: RegistrationRecord; created: boolean }> {
  const existingVisit = await deps.visitRepo.findByIdempotencyKey(
    tenantId,
    ctx.idempotencyKey,
  );
  if (existingVisit) {
    const registration =
      (await deps.registrationRepo.findByIdempotencyKey(tenantId, ctx.idempotencyKey)) ??
      (await deps.registrationRepo.findByPatientId(tenantId, existingVisit.patient_id));
    if (!registration) {
      throw new Error("registration_missing_for_existing_patient_visit");
    }
    return { visit: existingVisit, registration, created: false };
  }

  const detail = await deps.empiGateway.fetchPatientDetail(
    tenantId,
    input.patient_id,
    ctx.bearerToken,
  );
  if (!detail) {
    throw new Error("empi_patient_not_found");
  }

  const wire = {
    ...detail.patient,
    abha_number: detail.abha_number ?? detail.patient.abha_number ?? null,
    abha_address: detail.abha_address ?? detail.patient.abha_address ?? null,
  };
  const mapped = mapEmpiPatientToSnapshot(wire, wire.id);

  const intakeOverlay: Record<string, unknown> = { ...(input.patient ?? {}) };
  if (input.abha_number?.trim()) intakeOverlay.abha_number = input.abha_number.trim();
  if (input.abha_address?.trim()) intakeOverlay.abha_address = input.abha_address.trim();
  const patientSnapshot = mergeIntakeIntoSnapshot(mapped.snapshot, intakeOverlay);

  const registrationResult = await createRegistration(
    deps,
    tenantId,
    {
      patient_id: input.patient_id,
      patient_source_record_id: mapped.sourceRecordId,
      patient_snapshot: patientSnapshot,
    },
    ctx,
  );

  const abhaAddress = abhaAddressFromIntake(intakeOverlay);
  if (abhaAddress) {
    await deps.empiGateway.linkAbhaAddress(
      tenantId,
      input.patient_id,
      abhaAddress,
      ctx.actorId,
      ctx.bearerToken,
    );
  }

  const empiAddress = mapRegistrationAddressToEmpiBody(input.permanent_address);
  if (empiAddress) {
    await deps.empiGateway.upsertPermanentAddress(
      tenantId,
      input.patient_id,
      empiAddress,
      ctx.actorId,
      ctx.bearerToken,
    );
  }

  const visitResult = await createVisit(
    deps,
    tenantId,
    {
      patient_id: input.patient_id,
      facility_id: input.facility_id,
      visit_type: input.visit_type,
      consultation_type: input.consultation_type,
      department_id: input.department_id,
      doctor_id: input.doctor_id,
      appointment_id: input.appointment_id,
      intake_completion: input.intake_completion,
    },
    {
      idempotencyKey: ctx.idempotencyKey,
      actorId: ctx.actorId,
      bearerToken: ctx.bearerToken,
      initialStatus: visitStatusFromIntakeCompletion(input.intake_completion ?? "partial"),
    },
  );

  return {
    visit: visitResult.record,
    registration: registrationResult.record,
    created: registrationResult.created || visitResult.created,
  };
}
