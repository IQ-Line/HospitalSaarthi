import type { IntakeCompletion } from "./registration-helpers.js";

export const VISIT_STATUS_PENDING = "pending" as const;
export const VISIT_STATUS_IN_PROGRESS = "in_progress" as const;
export const VISIT_STATUS_COMPLETED = "completed" as const;
export const VISIT_STATUS_CANCELLED = "cancelled" as const;

export const VISIT_STATUSES = [
  VISIT_STATUS_PENDING,
  VISIT_STATUS_IN_PROGRESS,
  VISIT_STATUS_COMPLETED,
  VISIT_STATUS_CANCELLED,
] as const;

export type VisitStatus = (typeof VISIT_STATUSES)[number];

export type { IntakeCompletion };

export function parseVisitStatus(value: string): VisitStatus {
  if ((VISIT_STATUSES as readonly string[]).includes(value)) {
    return value as VisitStatus;
  }
  throw new Error("invalid_visit_status");
}

export function visitStatusFromIntakeCompletion(
  completion: IntakeCompletion = "pending",
): VisitStatus {
  switch (completion) {
    case "complete":
      return VISIT_STATUS_COMPLETED;
    case "partial":
      return VISIT_STATUS_IN_PROGRESS;
    default:
      return VISIT_STATUS_PENDING;
  }
}
