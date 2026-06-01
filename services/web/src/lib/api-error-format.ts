type ApiErrorJson = {
  detail?: unknown;
  error?: unknown;
  message?: unknown;
};

const GENERIC_HTTP_ERROR_LABELS = new Set([
  'Bad Request',
  'Conflict',
  'Not Found',
  'Forbidden',
  'Unauthorized',
  'Internal Server Error',
  'Unprocessable Entity',
]);

const KNOWN_API_MESSAGES: Record<string, string> = {
  registration_fee_already_exists:
    'Only one active registration fee is allowed. Deactivate the existing registration fee first.',
  provider_department_tariff_already_exists:
    'This doctor already has a tariff in this department.',
  tariff_conflict: 'A duplicate registration fee or doctor/department tariff already exists.',
};

function truncateMessage(text: string, max = 400): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

/** Turn `code: human text` (or known codes) into desk-friendly copy. */
export function humanizeApiMessage(message: string): string {
  const trimmed = message.trim();
  if (!trimmed) return trimmed;

  const colonIdx = trimmed.indexOf(':');
  if (colonIdx > 0) {
    const code = trimmed.slice(0, colonIdx).trim();
    const rest = trimmed.slice(colonIdx + 1).trim();
    if (KNOWN_API_MESSAGES[code]) return KNOWN_API_MESSAGES[code];
    if (rest.length > 0) return rest;
  }

  return KNOWN_API_MESSAGES[trimmed] ?? trimmed;
}

function isGenericHttpErrorLabel(value: string): boolean {
  return GENERIC_HTTP_ERROR_LABELS.has(value.trim());
}

/** Parse JSON API error bodies (FastAPI `detail`, Fastify `error`, generic `message`). */
export function formatApiErrorBody(status: number, body: string): string {
  const raw = body?.trim();
  if (!raw) return `Request failed (${status})`;
  try {
    const parsed = JSON.parse(raw) as ApiErrorJson;
    const d = parsed.detail;
    if (typeof d === 'string') return truncateMessage(humanizeApiMessage(d));
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
        return truncateMessage(parts.map(humanizeApiMessage).join('; '));
      }
    }
    if (typeof parsed.message === 'string' && parsed.message.length > 0) {
      return truncateMessage(humanizeApiMessage(parsed.message));
    }
    if (typeof parsed.error === 'string' && parsed.error.length > 0) {
      if (!isGenericHttpErrorLabel(parsed.error)) {
        return truncateMessage(humanizeApiMessage(parsed.error));
      }
    }
  } catch {
    /* fall through */
  }
  return truncateMessage(raw);
}
