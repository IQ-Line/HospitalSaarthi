/** Parse JSON API error bodies (e.g. FastAPI) into a single user-visible string. */
export function formatApiErrorBody(status: number, body: string): string {
  const raw = body?.trim();
  if (!raw) return `Request failed (${status})`;
  try {
    const parsed = JSON.parse(raw) as { detail?: unknown; message?: unknown };
    const d = parsed.detail;
    if (typeof d === 'string') return d.length > 400 ? `${d.slice(0, 400)}…` : d;
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
        const s = parts.join('; ');
        return s.length > 400 ? `${s.slice(0, 400)}…` : s;
      }
    }
    if (typeof parsed.message === 'string' && parsed.message.length > 0) {
      return parsed.message.length > 400 ? `${parsed.message.slice(0, 400)}…` : parsed.message;
    }
  } catch {
    /* fall through */
  }
  return raw.length > 400 ? `${raw.slice(0, 400)}…` : raw;
}
