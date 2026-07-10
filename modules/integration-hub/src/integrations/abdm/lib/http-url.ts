/**
 * Strip all trailing slashes from a base URL or path.
 *
 * Linear, allocation-light, and regex-free — deliberately NOT `.replace(/\/+$/, "")`,
 * which `sonarjs/slow-regex` flags (the anchored `+` is in fact only linear, but a
 * shared non-regex helper is clearer than a justified-disable on every base-URL site,
 * and removes the duplicated normalization across the data-access HTTP clients).
 */
export function stripTrailingSlashes(value: string): string {
  let end = value.length;
  while (end > 0 && value[end - 1] === "/") {
    end -= 1;
  }
  return value.slice(0, end);
}
