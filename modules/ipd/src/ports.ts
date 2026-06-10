import type { Episode, EpisodeListQuery, DashboardStats } from "./domain/episode.js";
import type { Bed } from "./domain/bed.js";

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
  transitionToAdmitted(
    tenantId: string,
    episodeId: string,
    admittedAt: string,
  ): Promise<Episode | null>;
  dashboardStats(tenantId: string): Promise<DashboardStats>;
  nextEpisodeNumber(tenantId: string): Promise<string>;
}

export interface BedRepo {
  getById(tenantId: string, bedId: string): Promise<Bed | null>;
  reserveForEpisode(tenantId: string, bedId: string, episodeId: string): Promise<Bed | null>;
  occupyForEpisode(
    tenantId: string,
    bedId: string,
    episodeId: string,
    patientId: string,
  ): Promise<Bed | null>;
  releaseReservation(tenantId: string, bedId: string, episodeId: string): Promise<void>;
}
