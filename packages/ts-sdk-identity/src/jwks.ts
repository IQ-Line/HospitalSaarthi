import { importJWK } from "jose";
import type { JWK, JWTHeaderParameters } from "jose";

const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000;

type ImportedJwkKey = Awaited<ReturnType<typeof importJWK>>;

type CachedKidKey = {
  key: ImportedJwkKey;
  expiresAtMs: number;
};

type CachedJwks = {
  kidCache: Map<string, CachedKidKey>;
};

const jwksCacheByUrl = new Map<string, CachedJwks>();

export class IdentityJwksError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IdentityJwksError";
  }
}

function getOrCreateCache(jwksUrl: string): CachedJwks {
  const existing = jwksCacheByUrl.get(jwksUrl);
  if (existing) return existing;
  const created: CachedJwks = {
    kidCache: new Map(),
  };
  jwksCacheByUrl.set(jwksUrl, created);
  return created;
}

function hasSupportedAlg(jwk: JWK, alg: string): boolean {
  if (typeof jwk.alg === "string") {
    return jwk.alg === alg;
  }
  // No `alg` on the JWK: key_ops is operational metadata, not algorithm
  // metadata, so an absent `alg` is treated as supported for the requested alg.
  return true;
}

async function fetchJwksDocument(jwksUrl: string): Promise<{ keys: JWK[] }> {
  let response: Response;
  try {
    response = await fetch(jwksUrl, { method: "GET" });
  } catch {
    throw new IdentityJwksError("JWKS fetch failed");
  }

  if (!response.ok) {
    throw new IdentityJwksError(`JWKS fetch failed with status ${response.status}`);
  }

  let parsed: unknown;
  try {
    parsed = await response.json();
  } catch {
    throw new IdentityJwksError("JWKS parse failed");
  }

  if (
    parsed == null ||
    typeof parsed !== "object" ||
    !Array.isArray((parsed as { keys?: unknown }).keys)
  ) {
    throw new IdentityJwksError("JWKS payload is invalid");
  }

  return parsed as { keys: JWK[] };
}

export function getJwksKeyFn(
  jwksUrl: string,
  cacheTtlMs: number = DEFAULT_CACHE_TTL_MS,
) {
  return async (protectedHeader: JWTHeaderParameters): Promise<ImportedJwkKey> => {
    const kid = protectedHeader.kid;
    if (typeof kid !== "string" || kid.length === 0) {
      throw new IdentityJwksError("JWT header missing kid");
    }

    const alg = protectedHeader.alg;
    if (typeof alg !== "string" || alg.length === 0) {
      throw new IdentityJwksError("JWT header missing alg");
    }

    const cache = getOrCreateCache(jwksUrl);
    const nowMs = Date.now();
    const cached = cache.kidCache.get(kid);
    if (cached && cached.expiresAtMs > nowMs) {
      return cached.key;
    }

    const jwks = await fetchJwksDocument(jwksUrl);
    const jwk = jwks.keys.find((entry) => entry.kid === kid);
    if (!jwk) {
      throw new IdentityJwksError(`Unknown kid: ${kid}`);
    }

    if (!hasSupportedAlg(jwk, alg)) {
      throw new IdentityJwksError(`Unsupported key algorithm for kid: ${kid}`);
    }

    let key: ImportedJwkKey;
    try {
      key = await importJWK(jwk, alg);
    } catch {
      throw new IdentityJwksError(`Failed to import JWKS key for kid: ${kid}`);
    }

    cache.kidCache.set(kid, {
      key,
      expiresAtMs: nowMs + cacheTtlMs,
    });

    return key;
  };
}

export function clearJwksCache(): void {
  jwksCacheByUrl.clear();
}
