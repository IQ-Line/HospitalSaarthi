/** Default OPD free follow-up policy when tenant config is missing. */
export const DEFAULT_FREE_FOLLOW_UP_DAYS = 15;
export const DEFAULT_FREE_FOLLOW_UP_VISITS = 1;

/** Picklist codes — keep aligned with master-data `visit-types` values you maintain. */
export const VISIT_TYPE_FIRST = "opd_first";
export const VISIT_TYPE_FOLLOW_UP = "opd_follow_up";
export const VISIT_TYPE_FREE_FOLLOW_UP = "opd_free_follow_up";

export type ConsultationType = "new" | "followup" | "free-followup";

export interface TenantFollowUpConfig {
  freeFollowUpDays: number;
  freeFollowUpVisits: number;
}

export interface FreeFollowUpDetails {
  original_visit_id: string;
  original_department_id: string | null;
  original_doctor_id: string | null;
  last_visit_date: string;
}

export class RegistrationValidationError extends Error {
  constructor(
    message: string,
    readonly statusCode = 400,
  ) {
    super(message);
    this.name = "RegistrationValidationError";
  }
}

export function normalizeFollowUpConfig(
  days: unknown,
  visits: unknown,
): TenantFollowUpConfig {
  const configuredDays = Number(days);
  const configuredVisits = Number(visits);
  return {
    freeFollowUpDays:
      Number.isFinite(configuredDays) && configuredDays >= 0
        ? configuredDays
        : DEFAULT_FREE_FOLLOW_UP_DAYS,
    freeFollowUpVisits:
      Number.isFinite(configuredVisits) && configuredVisits >= 0
        ? configuredVisits
        : DEFAULT_FREE_FOLLOW_UP_VISITS,
  };
}

export function consultationTypeFromVisitType(visitType: string | null | undefined): ConsultationType {
  const norm = (visitType ?? "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  if (norm === "opdfirst") return "new";
  if (norm === "opdfreefollowup") return "free-followup";
  if (norm === "opdfollowup") return "followup";
  return "new";
}

export function visitTypeCodeFromConsultationType(type: ConsultationType): string {
  if (type === "free-followup") return VISIT_TYPE_FREE_FOLLOW_UP;
  if (type === "followup") return VISIT_TYPE_FOLLOW_UP;
  return VISIT_TYPE_FIRST;
}

export function feeForConsultationType(type: ConsultationType): 0 | 1 {
  return type === "free-followup" ? 0 : 1;
}

export function diffDaysSince(from: Date, to: Date): number {
  const diffMs = to.getTime() - from.getTime();
  return diffMs / (1000 * 60 * 60 * 24);
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export interface VisitTypeDecisionResult {
  consultation_type: ConsultationType;
  visit_type_code: string;
  fee: 0 | 1;
  is_locked: boolean;
  resolved_patient_id: string | null;
  free_follow_up_visit_count: number;
  free_follow_up_visits_allowed: number;
  free_follow_up_visits_remaining: number;
  valid_till: string | null;
}

export function firstVisitDecision(config: TenantFollowUpConfig): VisitTypeDecisionResult {
  return {
    consultation_type: "new",
    visit_type_code: VISIT_TYPE_FIRST,
    fee: 1,
    is_locked: true,
    resolved_patient_id: null,
    free_follow_up_visit_count: 0,
    free_follow_up_visits_allowed: config.freeFollowUpVisits,
    free_follow_up_visits_remaining: config.freeFollowUpVisits,
    valid_till: null,
  };
}

export function computeVisitTypeDecision(
  config: TenantFollowUpConfig,
  resolvedPatientId: string,
  lastVisitCreatedAt: Date | null,
  freeFollowUpVisitCount: number,
): VisitTypeDecisionResult {
  const base = {
    resolved_patient_id: resolvedPatientId,
    free_follow_up_visit_count: freeFollowUpVisitCount,
    free_follow_up_visits_allowed: config.freeFollowUpVisits,
    free_follow_up_visits_remaining: Math.max(config.freeFollowUpVisits - freeFollowUpVisitCount, 0),
    is_locked: true,
  };

  if (!lastVisitCreatedAt) {
    return {
      ...base,
      consultation_type: "new",
      visit_type_code: VISIT_TYPE_FIRST,
      fee: 1,
      valid_till: null,
    };
  }

  const today = new Date();
  const diffDays = diffDaysSince(lastVisitCreatedAt, today);
  const withinWindow =
    config.freeFollowUpDays > 0 && diffDays <= config.freeFollowUpDays;
  const quotaRemaining =
    config.freeFollowUpVisits > 0 && freeFollowUpVisitCount < config.freeFollowUpVisits;

  if (withinWindow && quotaRemaining) {
    const validTill = addDays(lastVisitCreatedAt, config.freeFollowUpDays);
    return {
      ...base,
      consultation_type: "free-followup",
      visit_type_code: VISIT_TYPE_FREE_FOLLOW_UP,
      fee: 0,
      valid_till: validTill.toISOString(),
    };
  }

  return {
    ...base,
    consultation_type: "followup",
    visit_type_code: VISIT_TYPE_FOLLOW_UP,
    fee: 1,
    valid_till: null,
  };
}
