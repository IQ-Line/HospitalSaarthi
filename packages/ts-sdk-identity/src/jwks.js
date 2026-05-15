import { importJWK } from "jose";
const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000;
const jwksCacheByUrl = new Map();
export class IdentityJwksError extends Error {
    constructor(message) {
        super(message);
        this.name = "IdentityJwksError";
    }
}
function getOrCreateCache(jwksUrl) {
    const existing = jwksCacheByUrl.get(jwksUrl);
    if (existing)
        return existing;
    const created = {
        kidCache: new Map(),
    };
    jwksCacheByUrl.set(jwksUrl, created);
    return created;
}
function hasSupportedAlg(jwk, alg) {
    if (typeof jwk.alg === "string") {
        return jwk.alg === alg;
    }
    if (Array.isArray(jwk.key_ops)) {
        // key_ops is operational metadata, not algorithm metadata.
        return true;
    }
    return true;
}
async function fetchJwksDocument(jwksUrl) {
    let response;
    try {
        response = await fetch(jwksUrl, { method: "GET" });
    }
    catch {
        throw new IdentityJwksError("JWKS fetch failed");
    }
    if (!response.ok) {
        throw new IdentityJwksError(`JWKS fetch failed with status ${response.status}`);
    }
    let parsed;
    try {
        parsed = await response.json();
    }
    catch {
        throw new IdentityJwksError("JWKS parse failed");
    }
    if (parsed == null ||
        typeof parsed !== "object" ||
        !Array.isArray(parsed.keys)) {
        throw new IdentityJwksError("JWKS payload is invalid");
    }
    return parsed;
}
export function getJwksKeyFn(jwksUrl, cacheTtlMs = DEFAULT_CACHE_TTL_MS) {
    return async (protectedHeader) => {
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
        let key;
        try {
            key = await importJWK(jwk, alg);
        }
        catch {
            throw new IdentityJwksError(`Failed to import JWKS key for kid: ${kid}`);
        }
        cache.kidCache.set(kid, {
            key,
            expiresAtMs: nowMs + cacheTtlMs,
        });
        return key;
    };
}
export function clearJwksCache() {
    jwksCacheByUrl.clear();
}
//# sourceMappingURL=jwks.js.map