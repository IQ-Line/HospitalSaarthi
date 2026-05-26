import type { SmartParchaConfig } from '../config.js';
import type { HimsPort } from '../ports.js';
import type { FullContextDto, RequestContext } from '../types.js';
import { buildUrl, himsFetch } from './http-client.js';

export class HttpHimsAdapter implements HimsPort {
  constructor(private readonly cfg: SmartParchaConfig) {}

  async getFullContextDelegated(
    visitId: string,
    ctx: RequestContext,
    opts: { addendum: boolean },
  ): Promise<FullContextDto> {
    const q = opts.addendum ? '?addendum=true' : '';
    const url = `${buildUrl(this.cfg.HIMS_BASE_URL, this.cfg.HIMS_PATH_FULL_CONTEXT, visitId)}${q}`;
    const raw = await himsFetch<FullContextDto>(this.cfg, url, ctx, { method: 'GET' });
    return {
      ...raw,
      resumedSameDay: Boolean((raw as { resumedSameDay?: boolean }).resumedSameDay),
      isAddendum: Boolean((raw as { isAddendum?: boolean }).isAddendum),
      immunizations: raw.immunizations ?? [],
      visits: raw.visits ?? [],
    };
  }

  async savePrescriptionDraft(
    visitId: string,
    prescription: Record<string, unknown>,
    immunizations: unknown[] | undefined,
    ctx: RequestContext,
  ): Promise<unknown> {
    const url = buildUrl(
      this.cfg.HIMS_BASE_URL,
      this.cfg.HIMS_PATH_SAVE_PRESCRIPTION_V2,
      visitId,
    );
    return himsFetch(this.cfg, url, ctx, {
      method: 'POST',
      body: JSON.stringify({ prescription, immunizations }),
    });
  }

  async endConsultation(
    visitId: string,
    body: Record<string, unknown>,
    ctx: RequestContext,
  ): Promise<unknown> {
    const url = buildUrl(this.cfg.HIMS_BASE_URL, this.cfg.HIMS_PATH_END_CONSULTATION, visitId);
    return himsFetch(this.cfg, url, ctx, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async postConsultation(
    visitId: string,
    body: Record<string, unknown>,
    ctx: RequestContext,
  ): Promise<unknown> {
    const url = buildUrl(this.cfg.HIMS_BASE_URL, this.cfg.HIMS_PATH_POST_CONSULTATION, visitId);
    return himsFetch(this.cfg, url, ctx, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }
}
