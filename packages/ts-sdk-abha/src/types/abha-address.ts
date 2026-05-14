/**
 * ABHA Address — the human-readable health-ID alias, format `name@suffix`.
 *
 * - Production gateway suffix: `@abdm`
 * - Sandbox gateway suffix:    `@sbx`
 *
 * @see https://abdm.gov.in/abha
 */

import { ABDM_SUFFIX, SBX_SUFFIX } from '../constants/gateway-suffixes.js';

export type AbhaAddress = string & { readonly __brand: 'AbhaAddress' };

export interface ParsedAbhaAddress {
  /** Local part before the `@`, e.g. `ramesh.kumar`. */
  alias: string;
  /** Suffix including the `@`, e.g. `@abdm` or `@sbx`. */
  suffix: typeof ABDM_SUFFIX | typeof SBX_SUFFIX;
}

const ABHA_ADDRESS_REGEX = /^[a-zA-Z0-9._]{4,}(@abdm|@sbx)$/;

/** Allowed suffixes for the current execution environment. */
export type GatewayEnv = 'production' | 'sandbox';

export function suffixesForEnv(env: GatewayEnv): readonly string[] {
  return env === 'production' ? [ABDM_SUFFIX] : [SBX_SUFFIX, ABDM_SUFFIX];
}

/**
 * Parse an ABHA Address string into its components.
 *
 * TODO: tighten alias rules per NRCeS guidance (length, allowed punctuation).
 * The regex below covers the documented baseline; final rules await the
 * NHA's published spec section the team needs to verify.
 */
export function parseAbhaAddress(input: string): ParsedAbhaAddress | null {
  const m = ABHA_ADDRESS_REGEX.exec(input);
  if (!m) return null;
  const at = input.lastIndexOf('@');
  return {
    alias: input.slice(0, at),
    suffix: input.slice(at) as ParsedAbhaAddress['suffix'],
  };
}

export function isValidAbhaAddress(input: string, env: GatewayEnv): input is AbhaAddress {
  const parsed = parseAbhaAddress(input);
  if (!parsed) return false;
  return suffixesForEnv(env).includes(parsed.suffix);
}
