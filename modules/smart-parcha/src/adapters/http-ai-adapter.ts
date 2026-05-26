import type { SmartParchaConfig } from '../config.js';
import type { AiExtractPort } from '../ports.js';
import type { RequestContext } from '../types.js';
import { pickHeaders } from './http-client.js';

export class HttpAiExtractAdapter implements AiExtractPort {
  constructor(private readonly cfg: SmartParchaConfig) {}

  async extractFromFrame(
    visitId: string,
    frame: string,
    ctx: RequestContext,
  ) {
    if (!this.cfg.AI_EXTRACT_URL) {
      return { success: true, skipped: true };
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.cfg.AI_TIMEOUT_MS);
    try {
      const res = await fetch(this.cfg.AI_EXTRACT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...pickHeaders(this.cfg, ctx),
        },
        body: JSON.stringify({ visitId, frame }),
        signal: controller.signal,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { success: false, skipped: true };
      }
      const data = (body as { data?: unknown }).data ?? body;
      return data as {
        success: boolean;
        skipped?: boolean;
        mappedFields?: Record<string, string>;
        visitPadPrescription?: Record<string, unknown>;
      };
    } catch {
      return { success: false, skipped: true };
    } finally {
      clearTimeout(timeout);
    }
  }
}
