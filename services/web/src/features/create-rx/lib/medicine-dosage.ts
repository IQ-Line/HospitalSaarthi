/** Parse legacy M-A-N dosage strings (e.g. `1-0-1`) into three parts. */
export function parseMedicineDosageMan(dosage: string | null | undefined): {
  morning: string;
  afternoon: string;
  night: string;
} {
  const trimmed = (dosage ?? '').trim();
  if (!trimmed) {
    return { morning: '', afternoon: '', night: '' };
  }

  const parts = trimmed.split('-').map((part) => part.trim());
  return {
    morning: parts[0] ?? '',
    afternoon: parts[1] ?? '',
    night: parts[2] ?? '',
  };
}

/** Combine M-A-N parts into the legacy `1-0-1` dosage string stored in the DB. */
export function formatMedicineDosageMan(parts: {
  morning?: string;
  afternoon?: string;
  night?: string;
}): string | null {
  const morning = (parts.morning ?? '').trim();
  const afternoon = (parts.afternoon ?? '').trim();
  const night = (parts.night ?? '').trim();

  if (!morning && !afternoon && !night) return null;
  return `${morning || '0'}-${afternoon || '0'}-${night || '0'}`;
}
