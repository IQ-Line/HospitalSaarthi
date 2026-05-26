import type { SmartParchaConfig } from '../config.js';
import { UpstreamError } from '../errors.js';
import { forwardHeaderNames } from '../config.js';
import type { RequestContext } from '../types.js';

export function buildUrl(base: string, template: string, ...params: string[]): string {
  const root = base.replace(/\/$/, '');
  let path = template;
  for (const p of params) {
    path = path.replace('%s', encodeURIComponent(p));
  }
  if (!path.startsWith('/')) path = `/${path}`;
  return `${root}${path}`;
}

export function pickHeaders(
  cfg: SmartParchaConfig,
  ctx: RequestContext,
): Record<string, string> {
  const out: Record<string, string> = { Accept: 'application/json' };
  const names = new Set(forwardHeaderNames(cfg));
  for (const [k, v] of Object.entries(ctx.headers)) {
    if (names.has(k.toLowerCase()) && v) out[k] = v;
  }
  if (cfg.HIMS_SERVICE_API_KEY) {
    out['X-Service-Key'] = cfg.HIMS_SERVICE_API_KEY;
  }
  return out;
}

export function unwrapData<T>(body: unknown): T {
  let cur: unknown = body;
  for (let i = 0; i < 6; i++) {
    if (!cur || typeof cur !== 'object') break;
    const o = cur as Record<string, unknown>;
    if (o.patient && o.visit) return cur as T;
    if (o.data !== undefined) {
      cur = o.data;
      continue;
    }
    break;
  }
  return cur as T;
}

export async function himsFetch<T>(
  cfg: SmartParchaConfig,
  url: string,
  ctx: RequestContext,
  init: RequestInit = {},
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), cfg.HIMS_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...pickHeaders(cfg, ctx),
        ...(init.headers as Record<string, string> | undefined),
      },
      signal: controller.signal,
    });
    const text = await res.text();
    let body: unknown = null;
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = text;
      }
    }
    if (!res.ok) {
      const msg =
        typeof body === 'object' && body && 'message' in body
          ? String((body as { message: unknown }).message)
          : res.statusText;
      throw new UpstreamError(`HIMS ${res.status}: ${msg}`, res.status >= 500 ? 502 : res.status);
    }
    return unwrapData<T>(body);
  } catch (err) {
    if (err instanceof UpstreamError) throw err;
    if ((err as Error).name === 'AbortError') {
      throw new UpstreamError('HIMS request timed out', 504);
    }
    throw new UpstreamError((err as Error).message || 'HIMS request failed', 502);
  } finally {
    clearTimeout(timeout);
  }
}
