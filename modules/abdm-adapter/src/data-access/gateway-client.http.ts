/**
 * HTTP implementation of `GatewayClient`.
 *
 * TODO: implement with axios or undici. Responsibilities:
 *   1. Authenticate against `/v0.5/sessions` (or v3 equivalent) using
 *      `clientId` + `clientSecret` from `SecretsClient.resolve('env:ABDM_*')`.
 *      Cache the bearer token until its TTL minus a safety margin.
 *   2. On every call, attach the bearer token + a fresh `REQUEST-ID` (UUID v4)
 *      + ISO-8601 `TIMESTAMP`. Add `X-CM-ID`, `X-HIP-ID`, `X-HIU-ID` per call.
 *   3. Map gateway errors to a typed error shape (re-use
 *      `@hims/ts-sdk-abha/constants/error-codes`'s `ABDM_ERROR_CODES`).
 *
 * Type the response generic from `@hims/ts-sdk-abha/protocol/{m1,m2,m3}`.
 */

export {};
