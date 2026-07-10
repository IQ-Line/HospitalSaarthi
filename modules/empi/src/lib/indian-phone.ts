import { normalizeIndianMobile } from "@hims/ts-sdk-india";

/**
 * Canonical EMPI storage/query format — `+91${tenDigit}`.
 * Thin alias over the shared {@link normalizeIndianMobile} so EMPI call sites keep
 * their existing name while the rule lives once in `@hims/ts-sdk-india`.
 */
export const normalizeIndianPhoneForEmpi = normalizeIndianMobile;
