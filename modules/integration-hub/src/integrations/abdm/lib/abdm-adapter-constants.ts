/** Event source labels for ABDM (unchanged for protocol compatibility; runtime is integration-hub). */

export const ABDM_ADAPTER_SOURCE_MODULE = "abdm-adapter" as const;

/** Env-prefix the SecretsClient resolves; see ADR-0027 follow-up + schema-reference. */
export const ABDM_SECRET_REF_PREFIX = "env:ABDM_" as const;
