/** JSON in tariff `description` for per-department room / OPD schedule (not in billing schema yet). */

export type DoctorTariffMeta = {
  room_number: string;
  opd_days: string[];
};

export function encodeDoctorTariffDescription(meta: DoctorTariffMeta): string | null {
  const room = meta.room_number.trim();
  const days = meta.opd_days.filter((d) => typeof d === 'string' && d.trim() !== '');
  if (!room && days.length === 0) return null;
  return JSON.stringify({
    _doctor: {
      room_number: room || null,
      opd_days: days,
    },
  });
}

export function decodeDoctorTariffDescription(description: string | null | undefined): DoctorTariffMeta {
  if (!description?.trim()) return { room_number: '', opd_days: [] };
  try {
    const parsed = JSON.parse(description) as { _doctor?: { room_number?: unknown; opd_days?: unknown } };
    const block = parsed?._doctor;
    if (!block || typeof block !== 'object') return { room_number: '', opd_days: [] };
    return {
      room_number: typeof block.room_number === 'string' ? block.room_number : '',
      opd_days: Array.isArray(block.opd_days)
        ? block.opd_days.filter((d): d is string => typeof d === 'string')
        : [],
    };
  } catch {
    return { room_number: '', opd_days: [] };
  }
}

/** True when description holds UM-synced doctor room/OPD metadata (not a human note). */
export function isDoctorTariffMetadataDescription(
  description: string | null | undefined,
): boolean {
  if (!description?.trim()) return false;
  try {
    const parsed = JSON.parse(description) as { _doctor?: unknown };
    return parsed !== null && typeof parsed === 'object' && '_doctor' in parsed;
  } catch {
    return false;
  }
}

/** Description shown in billing forms — hides encoded doctor metadata. */
export function userVisibleTariffDescription(
  description: string | null | undefined,
): string | null {
  if (isDoctorTariffMetadataDescription(description)) return null;
  const trimmed = description?.trim();
  return trimmed === '' ? null : trimmed;
}

const OPD_DAY_LABELS: Record<string, string> = {
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
  sat: 'Sat',
  sun: 'Sun',
};

export function formatDoctorTariffMetaSummary(meta: DoctorTariffMeta): string {
  const parts: string[] = [];
  if (meta.room_number.trim()) {
    parts.push(`Room ${meta.room_number.trim()}`);
  }
  if (meta.opd_days.length > 0) {
    const days = meta.opd_days
      .map((d) => OPD_DAY_LABELS[d.toLowerCase()] ?? d)
      .join(', ');
    parts.push(`OPD ${days}`);
  }
  return parts.join(' · ') || '—';
}
