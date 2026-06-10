import type { EventBus } from "@hims/ts-sdk-events";
import type { Episode } from "../domain/episode.js";
import { createIpdEnvelope } from "../lib/ipd-helpers.js";

export const IPD_EVENT_EPISODE_ADMITTED = "ipd.episode.admitted" as const;

export type EpisodeAdmittedPayload = {
  id: string;
  iq_tenant_id: string;
  episode_number: string;
  patient_id: string;
  patient_name: string;
  visit_id: string | null;
  ward_id: string | null;
  bed_id: string | null;
  admission_type: string;
  admission_source: string;
  attending_consultant_id: string | null;
  provisional_diagnosis: string | null;
  financial_class: string;
  admitted_at: string;
};

function toPayload(episode: Episode): EpisodeAdmittedPayload {
  return {
    id: episode.id,
    iq_tenant_id: episode.iq_tenant_id,
    episode_number: episode.episode_number,
    patient_id: episode.patient_id,
    patient_name: episode.patient_name,
    visit_id: episode.visit_id,
    ward_id: episode.ward_id,
    bed_id: episode.bed_id,
    admission_type: episode.admission_type,
    admission_source: episode.admission_source,
    attending_consultant_id: episode.attending_consultant_id,
    provisional_diagnosis: episode.provisional_diagnosis,
    financial_class: episode.financial_class,
    admitted_at: episode.admitted_at!,
  };
}

export async function publishEpisodeAdmitted(
  deps: { eventBus: EventBus },
  episode: Episode,
  actorId: string | null | undefined,
): Promise<void> {
  await deps.eventBus.publish(
    createIpdEnvelope(
      IPD_EVENT_EPISODE_ADMITTED,
      episode.iq_tenant_id,
      actorId,
      toPayload(episode),
    ),
  );
}
