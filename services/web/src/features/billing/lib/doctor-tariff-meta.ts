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
