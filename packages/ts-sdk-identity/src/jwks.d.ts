import { importJWK } from "jose";
import type { JWTHeaderParameters } from "jose";
type ImportedJwkKey = Awaited<ReturnType<typeof importJWK>>;
export declare class IdentityJwksError extends Error {
    constructor(message: string);
}
export declare function getJwksKeyFn(jwksUrl: string, cacheTtlMs?: number): (protectedHeader: JWTHeaderParameters) => Promise<ImportedJwkKey>;
export declare function clearJwksCache(): void;
export {};
//# sourceMappingURL=jwks.d.ts.map