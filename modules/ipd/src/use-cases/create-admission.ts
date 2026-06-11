import { randomUUID } from "node:crypto";
import type {
  AdmissionSource,
  AdmissionType,
  Episode,
  EpisodeRepo,
  FinancialClass,
} from "../domain/episode.js";
import type { BedRepo } from "../ports.js";

export type CreateAdmissionInput = {
  admission_source: AdmissionSource;
  admission_type: AdmissionType;
  patient_id: string;
  patient_name: string;
  visit_id?: string | null;
  specialty_id?: string | null;
  attending_consultant_id?: string | null;
  provisional_diagnosis?: string | null;
  financial_class?: FinancialClass;
  deposit_amount?: number | null;
  expected_los_days?: number | null;
  ward_id?: string | null;
  bed_id?: string | null;
};

type CreateAdmissionDeps = {
  episodeRepo: EpisodeRepo;
  bedRepo: BedRepo;
};

export async function createAdmission(
  deps: CreateAdmissionDeps,
  tenantId: string,
  input: CreateAdmissionInput,
  idempotencyKey: string | null,
): Promise<Episode> {
  const id = randomUUID();
  const ts = new Date().toISOString();

  if (input.bed_id) {
    const reserved = await deps.bedRepo.reserveForEpisode(tenantId, input.bed_id, id);
    if (!reserved) {
      throw new Error("Bed is not available");
    }
  }

  const row: Episode = {
    id,
    iq_tenant_id: tenantId,
    episode_number: await deps.episodeRepo.nextEpisodeNumber(tenantId),
    visit_id: input.visit_id ?? null,
    patient_id: input.patient_id,
    patient_name: input.patient_name,
    admission_type: input.admission_type,
    admission_source: input.admission_source,
    status: "scheduled",
    ward_id: input.ward_id ?? null,
    bed_id: input.bed_id ?? null,
    specialty_id: input.specialty_id ?? null,
    attending_consultant_id: input.attending_consultant_id ?? null,
    provisional_diagnosis: input.provisional_diagnosis ?? null,
    financial_class: input.financial_class ?? "general",
    deposit_amount:
      typeof input.deposit_amount === "number" ? String(input.deposit_amount) : null,
    expected_los_days: input.expected_los_days ?? null,
    admitted_at: null,
    discharged_at: null,
    closure_type: null,
    closure_reason: null,
    idempotency_key: idempotencyKey,
    created_at: ts,
    updated_at: ts,
  };
  return deps.episodeRepo.insert(row);
}
