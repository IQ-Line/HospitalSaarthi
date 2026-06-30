/**
 * react-router imports named exports from "set-cookie-parser", which is CJS-only.
 * Re-export compatible helpers from cookie-es (already ESM).
 */
import { parseSetCookie, splitSetCookieString } from 'cookie-es';

export const splitCookiesString = splitSetCookieString;

export function parseString(
  setCookieValue: string,
  options?: { decodeValues?: boolean },
): ReturnType<typeof parseSetCookie> | null {
  const parsed = parseSetCookie(setCookieValue, {
    decode: options?.decodeValues === false ? false : undefined,
  });
  return parsed ?? null;
}

export function parse(
  input: string | string[] | null | undefined,
  options?: { decodeValues?: boolean; map?: boolean },
): ReturnType<typeof parseSetCookie>[] | Record<string, ReturnType<typeof parseSetCookie>> {
  if (!input) {
    return options?.map ? Object.create(null) : [];
  }

  const strings = Array.isArray(input) ? input : splitSetCookieString(input);
  const filtered = strings.filter((s) => typeof s === 'string' && s.trim().length > 0);

  if (options?.map) {
    const cookies = Object.create(null) as Record<string, NonNullable<ReturnType<typeof parseSetCookie>>>;
    for (const str of filtered) {
      const cookie = parseString(str, options);
      if (cookie?.name) {
        cookies[cookie.name] = cookie;
      }
    }
    return cookies;
  }

  return filtered
    .map((str) => parseString(str, options))
    .filter((cookie): cookie is NonNullable<typeof cookie> => cookie != null);
}

export default parse;
