/** Shared literals for abdm-adapter wiring and future events. */

export const ABDM_ADAPTER_SOURCE_MODULE = "abdm-adapter" as const;

/** Env-prefix the SecretsClient resolves; see ADR-0027 follow-up + schema-reference. */
export const ABDM_SECRET_REF_PREFIX = "env:ABDM_" as const;
