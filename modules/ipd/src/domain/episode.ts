export type AdmissionType = "planned" | "emergency" | "direct" | "transfer_in" | "daycare";
export type AdmissionSource = "opd" | "emergency" | "referral" | "walk_in";
export type EpisodeStatus =
  | "scheduled"
  | "admitted"
  | "discharge_planning"
  | "pending_clearance"
  | "discharged"
  | "cancelled";
export type ClosureType = "normal" | "lama" | "dama" | "abscond" | "death";
export type FinancialClass = "general" | "private" | "insurance" | "sponsored";

/** LLD-aligned episode row — `ipd.episodes`. */
export interface Episode {
  id: string;
  iq_tenant_id: string;
  episode_number: string;
  visit_id: string | null;
  patient_id: string;
  patient_name: string;
  admission_type: AdmissionType;
  admission_source: AdmissionSource;
  status: EpisodeStatus;
  ward_id: string | null;
  bed_id: string | null;
  specialty_id: string | null;
  attending_consultant_id: string | null;
  provisional_diagnosis: string | null;
  financial_class: FinancialClass;
  deposit_amount: string | null;
  expected_los_days: number | null;
  admitted_at: string | null;
  discharged_at: string | null;
  closure_type: ClosureType | null;
  closure_reason: string | null;
  idempotency_key: string | null;
  created_at: string;
  updated_at: string;
}

export interface EpisodeListQuery {
  status?: string[];
  admission_source?: string;
  admission_type?: string;
  ward_id?: string;
  q?: string;
  page: number;
  limit: number;
}

export interface DashboardStats {
  admissions_today: number;
  discharges_today: number;
  scheduled_episodes: number;
  active_episodes: number;
}

export interface EpisodeRepo {
  list(tenantId: string, query: EpisodeListQuery): Promise<{
    data: Episode[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  }>;
  getById(tenantId: string, episodeId: string): Promise<Episode | null>;
  getByIdempotencyKey(tenantId: string, key: string): Promise<Episode | null>;
  getByVisitId(tenantId: string, visitId: string): Promise<Episode | null>;
  insert(row: Episode): Promise<Episode>;
  update(tenantId: string, episodeId: string, patch: Partial<Episode>): Promise<Episode | null>;
  dashboardStats(tenantId: string): Promise<DashboardStats>;
  nextEpisodeNumber(tenantId: string): Promise<string>;
}

/** Statuses allowed for PATCH /admissions/:id (pre-admission intake only). */
export const EDITABLE_EPISODE_STATUSES: readonly EpisodeStatus[] = ["scheduled"];

/** Fields clients may PATCH — immutable identity / lifecycle fields excluded. */
export const ALLOWED_PATCH_FIELDS = [
  "specialty_id",
  "attending_consultant_id",
  "provisional_diagnosis",
  "financial_class",
  "deposit_amount",
  "expected_los_days",
  "ward_id",
  "bed_id",
] as const satisfies readonly (keyof Episode)[];

export type EpisodePatch = Partial<Pick<Episode, (typeof ALLOWED_PATCH_FIELDS)[number]>>;

export function toApi(row: Episode): Episode {
  return row;
}
