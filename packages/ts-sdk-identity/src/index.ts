export {
  validateAuthAndPdpConfig,
  validateAuthConfig,
} from "./config/validate-auth-config.js";
export { identityPlugin } from "./plugin.js";
export { verifyToken } from "./verify.js";
export { clearJwksCache, IdentityJwksError } from "./jwks.js";
export { IdentityVerificationError } from "./verify.js";
export type { Principal, IdentityPluginOptions, HimsJwtPayload } from "./types.js";
