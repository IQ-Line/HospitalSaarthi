/** Trailing-slash strip for base URLs (loop, not regex — `/\/+$/` is polynomial-backtracking). */
export function stripTrailingSlashes(value: string): string {
  let end = value.length;
  while (end > 0 && value.charCodeAt(end - 1) === 47 /* '/' */) {
    end -= 1;
  }
  return value.slice(0, end);
}
