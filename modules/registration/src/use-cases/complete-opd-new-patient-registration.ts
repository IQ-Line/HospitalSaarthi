import type { EventBus } from "@hims/ts-sdk-events";
import type {
  BillingReadPort,
  BillingWritePort,
  ConfiguratorHttpPort,
  EmpiHttpPort,
  RegistrationRepo,
  VisitRepo,
} from "../ports.js";
import type {
  OpdRegistrationCompleteInput,
  RegistrationWithVisitRecord,
} from "../domain/registration.types.js";
import { createIntakeForNewPatient, type IntakeContext } from "./create-intake-for-new-patient.js";
import { completeVisitIntake } from "./update-visit-status.js";
import { executeOpdRegistrationBilling } from "../lib/opd-registration-billing.js";
import { BillingWriteError } from "../lib/billing-write-error.js";
import { VISIT_STATUS_COMPLETED } from "../lib/visit-helpers.js";

export type CompleteOpdNewPatientRegistrationResult =
  | {
      ok: true;
      created: boolean;
      result: RegistrationWithVisitRecord;
      bill_id: string | null;
    }
  | {
      ok: false;
      phase: "intake";
      kind: "duplicate";
      body: {
        code: string;
        message: string;
        patient_id: string;
        patient_snapshot: import("../domain/registration.types.js").PatientDemographicsSnapshot;
      };
    }
  | {
      ok: false;
      phase: "intake";
      kind: "empi_error" | "empi_unavailable";
      status: number;
      body: string;
    }
  | {
      ok: false;
      phase: "billing";
      status: number;
      code: string;
      message: string;
      body?: unknown;
    }
  | {
      ok: false;
      phase: "complete";
      message: string;
    };

type IntakeFailure = Extract<
  Awaited<ReturnType<typeof createIntakeForNewPatient>>,
  { ok: false }
>;

/**
 * Translate a failed intake into the `phase: "intake"` completion result,
 * preserving the duplicate / empi-unavailable / empi-error distinction.
 */
function intakeFailureToResult(
  intake: IntakeFailure,
): Extract<CompleteOpdNewPatientRegistrationResult, { phase: "intake" }> {
  if (intake.kind === "duplicate") {
    return { ok: false, phase: "intake", kind: "duplicate", body: intake.body };
  }
  if (intake.kind === "empi_unavailable") {
    return {
      ok: false,
      phase: "intake",
      kind: "empi_unavailable",
      status: intake.status,
      body: intake.body,
    };
  }
  return {
    ok: false,
    phase: "intake",
    kind: "empi_error",
    status: intake.status,
    body: intake.body,
  };
}

export async function completeOpdNewPatientRegistration(
  deps: {
    registrationRepo: RegistrationRepo;
    visitRepo: VisitRepo;
    empiGateway: EmpiHttpPort;
    eventBus: EventBus;
    allocateOpVisitId: (tenantId: string) => Promise<string>;
    configuratorGateway?: ConfiguratorHttpPort;
    billingWritePort?: BillingWritePort;
    billingReadPort?: BillingReadPort;
  },
  tenantId: string,
  input: OpdRegistrationCompleteInput,
  ctx: IntakeContext,
): Promise<CompleteOpdNewPatientRegistrationResult> {
  const { billing, ...intakeFields } = input;
  const intakeInput = {
    ...intakeFields,
    intake_completion: intakeFields.intake_completion ?? "partial",
  };

  const intake = await createIntakeForNewPatient(
    {
      registrationRepo: deps.registrationRepo,
      visitRepo: deps.visitRepo,
      empiGateway: deps.empiGateway,
      allocateOpVisitId: deps.allocateOpVisitId,
      eventBus: deps.eventBus,
      configuratorGateway: deps.configuratorGateway,
    },
    tenantId,
    intakeInput,
    ctx,
  );

  if (!intake.ok) {
    return intakeFailureToResult(intake);
  }

  const { registration, visit } = intake.result;
  if (!registration || !visit) {
    return {
      ok: false,
      phase: "complete",
      message: "Registration intake missing registration or visit row",
    };
  }

  let billId: string | null = null;

  if (visit.status === VISIT_STATUS_COMPLETED && deps.billingReadPort) {
    const bills = await deps.billingReadPort.listBillsForRegistration(
      tenantId,
      registration.registration_id,
      { bearerToken: ctx.bearerToken, visitId: visit.id },
    );
    billId = bills[0]?.billId ?? null;
    return {
      ok: true,
      created: intake.created,
      result: { registration, visit },
      bill_id: billId,
    };
  }

  if (deps.billingWritePort && billing) {
    try {
      billId = await executeOpdRegistrationBilling(
        deps.billingWritePort,
        tenantId,
        {
          patient_id: registration.patient_id,
          registration_id: registration.registration_id,
          visit_id: visit.id,
          doctor_id: input.doctor_id,
          idempotencyKey: ctx.idempotencyKey,
          bearerToken: ctx.bearerToken,
        },
        billing,
      );
    } catch (err) {
      if (err instanceof BillingWriteError) {
        return {
          ok: false,
          phase: "billing",
          status: err.statusCode,
          code: err.code,
          message: err.message,
          body: err.body,
        };
      }
      throw err;
    }
  }

  const completedVisit = await completeVisitIntake(
    { visitRepo: deps.visitRepo },
    tenantId,
    visit.id,
    ctx.actorId,
  );

  if (!completedVisit) {
    return {
      ok: false,
      phase: "complete",
      message: "Visit not found while completing intake",
    };
  }

  return {
    ok: true,
    created: intake.created,
    result: { registration, visit: completedVisit },
    bill_id: billId,
  };
}
