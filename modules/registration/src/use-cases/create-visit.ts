import type { EventBus } from "@hims/ts-sdk-events";
import type { ConfiguratorHttpPort, VisitRepo } from "../ports.js";
import type { CreateVisitInput, InsertVisitResult } from "../domain/visit.types.js";
import {
  addDays,
  consultationTypeFromVisitType,
  diffDaysSince,
  normalizeFollowUpConfig,
  RegistrationValidationError,
  VISIT_TYPE_FREE_FOLLOW_UP,
  type ConsultationType,
  type FreeFollowUpDetails,
} from "../lib/follow-up.js";
import { visitStatusFromIntakeCompletion, type VisitStatus } from "../lib/visit-helpers.js";
import { publishVisitCreated } from "../events/publish-visit-created.js";

export type CreateVisitContext = {
  idempotencyKey: string;
  actorId: string;
  initialStatus?: VisitStatus;
  bearerToken?: string;
};

async function resolveFollowUpInsertFields(
  deps: {
    visitRepo: VisitRepo;
    configuratorGateway?: ConfiguratorHttpPort;
  },
  tenantId: string,
  input: CreateVisitInput,
): Promise<{
  consultation_type: ConsultationType;
  visit_type: string | null;
  is_free_follow_up: boolean;
  free_follow_up_visit_count: number;
  free_follow_up_valid_till: Date | null;
  free_follow_up_details: FreeFollowUpDetails | null;
  parent_visit_id: string | null;
}> {
  const consultationType =
    input.consultation_type ?? consultationTypeFromVisitType(input.visit_type);
  const visitType = input.visit_type ?? null;

  if (consultationType !== "free-followup") {
    return {
      consultation_type: consultationType,
      visit_type: visitType,
      is_free_follow_up: false,
      free_follow_up_visit_count: 0,
      free_follow_up_valid_till: null,
      free_follow_up_details: null,
      parent_visit_id: null,
    };
  }

  if (!input.department_id) {
    throw new RegistrationValidationError("Department is required for free follow-up visit");
  }

  const config = deps.configuratorGateway
    ? await deps.configuratorGateway.getTenantFollowUpConfig(tenantId)
    : normalizeFollowUpConfig(undefined, undefined);

  const lastVisit = await deps.visitRepo.findLatestByPatientAndDepartment(
    tenantId,
    input.patient_id,
    input.department_id,
  );

  if (!lastVisit) {
    throw new RegistrationValidationError("Patient is not eligible for free follow-up");
  }

  const usedCount = await deps.visitRepo.countFreeFollowUpVisits(
    tenantId,
    input.patient_id,
    input.department_id,
  );

  const withinWindow =
    config.freeFollowUpDays > 0 &&
    diffDaysSince(lastVisit.created_at, new Date()) <= config.freeFollowUpDays;
  const quotaRemaining =
    config.freeFollowUpVisits > 0 && usedCount < config.freeFollowUpVisits;

  if (!withinWindow || !quotaRemaining) {
    throw new RegistrationValidationError("Patient is not eligible for free follow-up");
  }

  return {
    consultation_type: "free-followup",
    visit_type: visitType ?? VISIT_TYPE_FREE_FOLLOW_UP,
    is_free_follow_up: true,
    free_follow_up_visit_count: usedCount + 1,
    free_follow_up_valid_till: addDays(lastVisit.created_at, config.freeFollowUpDays),
    free_follow_up_details: {
      original_visit_id: lastVisit.id,
      original_department_id: lastVisit.department_id,
      original_doctor_id: lastVisit.doctor_id,
      last_visit_date: lastVisit.created_at.toISOString(),
    },
    parent_visit_id: lastVisit.id,
  };
}

export async function createVisit(
  deps: {
    visitRepo: VisitRepo;
    allocateOpVisitId: (tenantId: string) => Promise<string>;
    eventBus: EventBus;
    configuratorGateway?: ConfiguratorHttpPort;
  },
  tenantId: string,
  input: CreateVisitInput,
  ctx: CreateVisitContext,
): Promise<InsertVisitResult> {
  const initialStatus =
    ctx.initialStatus ?? visitStatusFromIntakeCompletion(input.intake_completion);

  const followUpFields = await resolveFollowUpInsertFields(deps, tenantId, input);
  const enrichedInput: CreateVisitInput = {
    ...input,
    visit_type: followUpFields.visit_type,
    consultation_type: followUpFields.consultation_type,
    is_free_follow_up: followUpFields.is_free_follow_up,
    free_follow_up_visit_count: followUpFields.free_follow_up_visit_count,
    free_follow_up_valid_till: followUpFields.free_follow_up_valid_till,
    free_follow_up_details: followUpFields.free_follow_up_details,
    parent_visit_id: followUpFields.parent_visit_id,
  };

  const formattedVisitId = await deps.allocateOpVisitId(tenantId);

  const result = await deps.visitRepo.insert(
    tenantId,
    enrichedInput,
    formattedVisitId,
    ctx.idempotencyKey,
    ctx.actorId,
    initialStatus,
  );

  if (result.created) {
    // OPD becomes aware of new visits by reading the registration.visit table
    // cross-schema; there is no push from registration to OPD on visit creation.
    await publishVisitCreated(deps, result.record, ctx.actorId);
  }

  return result;
}
