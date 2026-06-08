export {
  validateAuthAndPdpConfig,
  validateAuthConfig,
} from "./config/validate-auth-config.js";
export { identityPlugin } from "./plugin.js";
export { verifyToken } from "./verify.js";
export { clearJwksCache, IdentityJwksError } from "./jwks.js";
export { IdentityVerificationError } from "./errors.js";
export type {
  Principal,
  IdentityPluginOptions,
  HimsJwtPayload,
  PartnerJwtConfig,
  PartnerJwtPayload,
} from "./types.js";
