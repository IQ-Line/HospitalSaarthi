/**
 * Common protocol types shared across M1/M2/M3.
 *
 * Re-exports the gateway header types, Fidelius envelope types, and ABDM
 * error code constants. The ABDM error code catalogue itself lives in
 * `../constants/error-codes.ts` (kept there for backward compatibility);
 * this barrel surfaces it under the protocol subpath for ergonomics.
 */

export * from './fidelius.js';
export * from './gateway-headers.js';
export * from './nha-public-certificate.js';
export { ABDM_ERROR_CODES, type AbdmErrorCode } from '../../constants/error-codes.js';
