import { randomUUID } from "node:crypto";
import type { FastifyRequest } from "fastify";
import type { DomainEvent } from "@hims/ts-sdk-events";
import { createEnvelope } from "@hims/ts-sdk-events";
import type { PatientDemographicsSnapshot } from "../domain/registration.types.js";

// ─── Lifecycle ────────────────────────────────────────────────────────────────

export const REGISTRATION_STATUS_PENDING = "pending" as const;
export const REGISTRATION_STATUS_IN_PROGRESS = "in_progress" as const;
export const REGISTRATION_STATUS_COMPLETED = "completed" as const;
export const REGISTRATION_STATUS_CANCELLED = "cancelled" as const;

export const REGISTRATION_STATUSES = [
  REGISTRATION_STATUS_PENDING,
  REGISTRATION_STATUS_IN_PROGRESS,
  REGISTRATION_STATUS_COMPLETED,
  REGISTRATION_STATUS_CANCELLED,
] as const;

export type RegistrationStatus = (typeof REGISTRATION_STATUSES)[number];

/** How far the desk visit-intake chain has progressed when the row is created. */
export type IntakeCompletion = "pending" | "partial" | "complete";

export function parseRegistrationStatus(value: string): RegistrationStatus {
  if ((REGISTRATION_STATUSES as readonly string[]).includes(value)) {
    return value as RegistrationStatus;
  }
  throw new Error("invalid_registration_status");
}

export function parseIntakeCompletion(value: string): IntakeCompletion {
  if (value === "pending" || value === "partial" || value === "complete") {
    return value;
  }
  throw new Error("invalid_intake_completion");
}

/**
 * Initial status on create:
 * - `complete` → visit intake fully done (registration + appointment + billing)
 * - `partial` → halfway (e.g. registration only; appointment/billing later)
 * - `pending` → started but not finished
 */
export function registrationStatusFromIntakeCompletion(
  completion: IntakeCompletion = "pending",
): RegistrationStatus {
  switch (completion) {
    case "complete":
      return REGISTRATION_STATUS_COMPLETED;
    case "partial":
      return REGISTRATION_STATUS_IN_PROGRESS;
    default:
      return REGISTRATION_STATUS_PENDING;
  }
}

// ─── Events (ADR-0017 in-process bus) ─────────────────────────────────────────

export const REGISTRATION_EVENT_REGISTRATION_CREATED =
  "registration.registration.created" as const;

export type RegistrationEventType = typeof REGISTRATION_EVENT_REGISTRATION_CREATED;

export const REGISTRATION_EVENT_CONTRACT_VERSION = "1.0.0";

export const REGISTRATION_SYSTEM_ACTOR_ID = "00000000-0000-0000-0000-000000000000";

export function resolveActorId(
  request: Pick<FastifyRequest, "user">,
  fallback?: string | null,
): string {
  const user = request.user as { id?: string } | undefined;
  if (user?.id && user.id.trim().length > 0) {
    return user.id.trim();
  }
  if (fallback && fallback.trim().length > 0) {
    return fallback.trim();
  }
  return REGISTRATION_SYSTEM_ACTOR_ID;
}

export function createRegistrationEnvelope<T extends Record<string, unknown>>(
  eventType: string,
  iqTenantId: string,
  actorId: string | null | undefined,
  payload: T,
): DomainEvent<T> {
  return createEnvelope({
    event_type: eventType,
    source_module: "registration",
    iq_tenant_id: iqTenantId,
    occurred_at: new Date().toISOString(),
    correlation_id: randomUUID(),
    actor_id: actorId ?? REGISTRATION_SYSTEM_ACTOR_ID,
    event_contract_version: REGISTRATION_EVENT_CONTRACT_VERSION,
    payload,
  });
}

// ─── Patient snapshot (frozen at registration time) ───────────────────────────

export type EmpiPatientWire = {
  id: string;
  uhid: string;
  abha_number?: string | null;
  abha_address?: string | null;
  full_name: string;
  phone_number: string;
  gender?: string | null;
  date_of_birth?: string | null;
  year_of_birth?: number | null;
};

export function mapEmpiPatientToSnapshot(
  patient: EmpiPatientWire,
  sourceRecordId: string,
): { patientId: string; sourceRecordId: string; snapshot: PatientDemographicsSnapshot } {
  return {
    patientId: patient.id,
    sourceRecordId,
    snapshot: {
      uhid: patient.uhid,
      abha_number: patient.abha_number ?? null,
      abha_address: patient.abha_address ?? null,
      full_name: patient.full_name,
      phone_number: patient.phone_number,
      gender: patient.gender ?? null,
      date_of_birth: patient.date_of_birth ?? null,
      year_of_birth: patient.year_of_birth ?? null,
    },
  };
}

// ─── HTTP idempotency ───────────────────────────────────────────────────────────

export function readIdempotencyKey(
  request: Pick<FastifyRequest, "headers">,
): string | undefined {
  const raw =
    request.headers["idempotency-key"] ?? request.headers["Idempotency-Key"];
  if (typeof raw === "string" && raw.trim().length > 0) {
    return raw.trim();
  }
  if (Array.isArray(raw)) {
    const first = raw.find((v) => typeof v === "string" && v.trim().length > 0);
    if (typeof first === "string") {
      return first.trim();
    }
  }
  return undefined;
}

export function idempotencyKeyRequiredResponse() {
  return {
    statusCode: 400,
    error: "Bad Request",
    message: "Idempotency-Key header is required for this operation",
    code: "idempotency_key_required",
  };
}
