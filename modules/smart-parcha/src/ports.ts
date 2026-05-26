import type {
  FullContextDto,
  ParchaPageDto,
  RequestContext,
  SaveAndIngestPayload,
  SaveAndIngestResult,
} from './types.js';

export type HimsPort = {
  getFullContextDelegated(
    visitId: string,
    ctx: RequestContext,
    opts: { addendum: boolean },
  ): Promise<FullContextDto>;
  savePrescriptionDraft(
    visitId: string,
    prescription: Record<string, unknown>,
    immunizations: unknown[] | undefined,
    ctx: RequestContext,
  ): Promise<unknown>;
  endConsultation(
    visitId: string,
    body: Record<string, unknown>,
    ctx: RequestContext,
  ): Promise<unknown>;
  postConsultation(
    visitId: string,
    body: Record<string, unknown>,
    ctx: RequestContext,
  ): Promise<unknown>;
};

export type AiExtractPort = {
  extractFromFrame(
    visitId: string,
    frame: string,
    ctx: RequestContext,
  ): Promise<{
    success: boolean;
    skipped?: boolean;
    mappedFields?: Record<string, string>;
    visitPadPrescription?: Record<string, unknown>;
  }>;
};

export type ParchaStorePort = {
  save(
    visitId: string,
    pages: ParchaPageDto[],
    meta: { doctorId: string; patientId: string },
  ): Promise<void>;
  get(visitId: string): Promise<ParchaPageDto[] | null>;
};

export type SmartParchaDeps = {
  hims: HimsPort;
  ai: AiExtractPort;
  parcha: ParchaStorePort;
  config: import('./config.js').SmartParchaConfig;
};

export type { SaveAndIngestPayload, SaveAndIngestResult };
