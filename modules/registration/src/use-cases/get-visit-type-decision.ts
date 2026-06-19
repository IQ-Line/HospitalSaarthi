import type {
  ConfiguratorHttpPort,
  EmpiHttpPort,
  RegistrationRepo,
  VisitRepo,
} from "../ports.js";
import type { VisitTypeDecisionPatientPayload } from "../domain/visit.types.js";
import {
  computeVisitTypeDecision,
  firstVisitDecision,
  normalizeFollowUpConfig,
  type VisitTypeDecisionResult,
} from "../lib/follow-up.js";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function trim(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

async function resolvePatientId(
  deps: {
    registrationRepo: RegistrationRepo;
    empiGateway?: EmpiHttpPort;
  },
  tenantId: string,
  patient: VisitTypeDecisionPatientPayload,
  bearerToken?: string,
): Promise<string | null> {
  const directId = trim(patient.patient_id);
  if (directId && UUID_RE.test(directId)) {
    const reg = await deps.registrationRepo.findByPatientId(tenantId, directId);
    if (reg) return directId;
  }

  if (!deps.empiGateway) return null;

  return deps.empiGateway.resolvePatientId(
    tenantId,
    {
      patient_id: directId || undefined,
      uhid: trim(patient.uhid) || undefined,
      abha_number: trim(patient.abha_number) || undefined,
      abha_address: trim(patient.abha_address) || undefined,
      phone_number: trim(patient.phone_number) || undefined,
      first_name: trim(patient.first_name) || undefined,
      middle_name: trim(patient.middle_name) || undefined,
      last_name: trim(patient.last_name) || undefined,
      gender: trim(patient.gender) || undefined,
      date_of_birth: trim(patient.date_of_birth) || undefined,
      age_years: patient.age_years,
      age_months: patient.age_months,
      age_days: patient.age_days,
    },
    bearerToken,
  );
}

export async function getVisitTypeDecision(
  deps: {
    visitRepo: VisitRepo;
    registrationRepo: RegistrationRepo;
    configuratorGateway?: ConfiguratorHttpPort;
    empiGateway?: EmpiHttpPort;
  },
  tenantId: string,
  departmentId: string,
  patient: VisitTypeDecisionPatientPayload | null | undefined,
  bearerToken?: string,
): Promise<VisitTypeDecisionResult> {
  const config = deps.configuratorGateway
    ? await deps.configuratorGateway.getTenantFollowUpConfig(tenantId)
    : normalizeFollowUpConfig(undefined, undefined);

  if (!departmentId?.trim()) {
    return { ...firstVisitDecision(config), is_locked: false };
  }

  if (!patient || typeof patient !== "object") {
    return firstVisitDecision(config);
  }

  const resolvedPatientId = await resolvePatientId(deps, tenantId, patient, bearerToken);
  if (!resolvedPatientId) {
    return firstVisitDecision(config);
  }

  const abhaAddress = trim(patient.abha_address);
  if (abhaAddress) {
    await deps.empiGateway?.linkAbhaAddress(
      tenantId,
      resolvedPatientId,
      abhaAddress,
      undefined,
      bearerToken,
    );
  }

  const lastVisit = await deps.visitRepo.findLatestByPatientAndDepartment(
    tenantId,
    resolvedPatientId,
    departmentId.trim(),
  );
  const freeFollowUpVisitCount = lastVisit
    ? await deps.visitRepo.countFreeFollowUpVisits(
        tenantId,
        resolvedPatientId,
        departmentId.trim(),
      )
    : 0;

  return computeVisitTypeDecision(
    config,
    resolvedPatientId,
    lastVisit?.created_at ?? null,
    freeFollowUpVisitCount,
  );
}
