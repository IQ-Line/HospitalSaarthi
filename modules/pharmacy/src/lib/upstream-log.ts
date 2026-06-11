/** Redact upstream HTTP bodies before logging — may contain PHI. */
export function truncateUpstreamBody(body: string, maxLength = 200): string {
  const trimmed = body.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }
  return `${trimmed.slice(0, maxLength)}… (${trimmed.length} chars)`;
}
