import type { IdentityPluginOptions, Principal } from "./types.js";
export declare class IdentityVerificationError extends Error {
    constructor(message: string);
}
export declare function verifyToken(token: string, options: IdentityPluginOptions): Promise<Principal>;
//# sourceMappingURL=verify.d.ts.map