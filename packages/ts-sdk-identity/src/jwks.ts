import { createRemoteJWKSet } from "jose";

const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000;

const jwksSets = new Map<
  string,
  ReturnType<typeof createRemoteJWKSet>
>();

export function getJwksKeyFn(
  jwksUrl: string,
  cacheTtlMs: number = DEFAULT_CACHE_TTL_MS,
): ReturnType<typeof createRemoteJWKSet> {
  const existing = jwksSets.get(jwksUrl);
  if (existing) return existing;

  const keyFn = createRemoteJWKSet(new URL(jwksUrl), {
    cacheMaxAge: cacheTtlMs,
    cooldownDuration: 30_000,
  });

  jwksSets.set(jwksUrl, keyFn);
  return keyFn;
}
