type ApiErrorJson = {
  detail?: unknown;
  error?: unknown;
  message?: unknown;
};

function truncateMessage(text: string, max = 400): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function isNginxPayloadTooLargeBody(body: string): boolean {
  const lower = body.toLowerCase();
  return (
    lower.includes('request entity too large') ||
    lower.includes('payload too large') ||
    (lower.includes('<title>413') && lower.includes('nginx'))
  );
}

/** Parse JSON API error bodies (FastAPI `detail`, Fastify `error`, generic `message`). */
export function formatApiErrorBody(status: number, body: string): string {
  const raw = body?.trim();
  if (!raw) return `Request failed (${status})`;
  if (status === 413 || isNginxPayloadTooLargeBody(raw)) {
    return 'File is too large to upload. Use an image of 2 MB or smaller.';
  }
  try {
    const parsed = JSON.parse(raw) as ApiErrorJson;
    const d = parsed.detail;
    if (typeof d === 'string') return truncateMessage(d);
    if (Array.isArray(d)) {
      const parts = d
        .map((item) => {
          if (typeof item === 'string') return item;
          if (item && typeof item === 'object' && 'msg' in item) {
            const m = (item as { msg?: unknown }).msg;
            return typeof m === 'string' ? m : null;
          }
          return null;
        })
        .filter((x): x is string => Boolean(x));
      if (parts.length > 0) {
        return truncateMessage(parts.join('; '));
      }
    }
    if (typeof parsed.error === 'string' && parsed.error.length > 0) {
      return truncateMessage(parsed.error);
    }
    if (typeof parsed.message === 'string' && parsed.message.length > 0) {
      return truncateMessage(parsed.message);
    }
  } catch {
    /* fall through */
  }
  return truncateMessage(raw);
}
