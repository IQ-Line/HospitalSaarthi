import type { FastifyRequest } from 'fastify';
import type { RequestContext } from './types.js';

export function requestContextFromFastify(req: FastifyRequest): RequestContext {
  const headers: Record<string, string> = {};
  for (const [k, v] of Object.entries(req.headers)) {
    if (typeof v === 'string') headers[k] = v;
    else if (Array.isArray(v)) headers[k] = v.join(',');
  }
  const query: Record<string, string> = {};
  for (const [k, v] of Object.entries(req.query as Record<string, unknown>)) {
    if (v != null) query[k] = String(v);
  }
  return { headers, query };
}
