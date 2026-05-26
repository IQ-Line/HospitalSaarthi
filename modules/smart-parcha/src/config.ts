import { z } from 'zod';

const schema = z.object({
  HIMS_ADAPTER: z.enum(['http', 'mock']).default('mock'),
  AI_ADAPTER: z.enum(['http', 'mock']).default('mock'),
  HIMS_BASE_URL: z.string().default('http://localhost:5000/hims-backend-ser'),
  HIMS_TIMEOUT_MS: z.coerce.number().default(15000),
  HIMS_DELEGATE_FULL_CONTEXT: z
    .string()
    .transform((v) => v === 'true' || v === '1')
    .default('true'),
  HIMS_PATH_FULL_CONTEXT: z.string().default('/v2/visits/%s/full-context'),
  HIMS_PATH_SAVE_PRESCRIPTION_V2: z.string().default('/v2/visits/%s/save-prescription'),
  HIMS_PATH_END_CONSULTATION: z.string().default('/v2/visits/%s/end-consultation'),
  HIMS_PATH_POST_CONSULTATION: z.string().default('/v2/visits/%s/post-consultation'),
  HIMS_FORWARD_HEADERS: z.string().default('authorization,x-tenant-id,x-user-id'),
  HIMS_SERVICE_API_KEY: z.string().optional(),
  AI_EXTRACT_URL: z.string().optional(),
  AI_TIMEOUT_MS: z.coerce.number().default(60000),
});

export type SmartParchaConfig = z.infer<typeof schema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): SmartParchaConfig {
  return schema.parse(env);
}

export function forwardHeaderNames(cfg: SmartParchaConfig): string[] {
  return cfg.HIMS_FORWARD_HEADERS.split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
}
