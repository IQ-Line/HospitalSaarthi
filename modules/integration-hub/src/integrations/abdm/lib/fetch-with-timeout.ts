const DEFAULT_MS = 30_000;

export function resolveGatewayFetchTimeoutMs(): number {
  const raw = process.env["ABDM_GATEWAY_TIMEOUT_MS"];
  if (raw === undefined || raw === "") return DEFAULT_MS;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_MS;
}

/** `fetch` with AbortSignal timeout (Node 18+). */
export async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = resolveGatewayFetchTimeoutMs(),
): Promise<Response> {
  return fetch(url, {
    ...init,
    signal: AbortSignal.timeout(timeoutMs),
  });
}
