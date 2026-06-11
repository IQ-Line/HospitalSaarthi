import type { WardBeds } from '../types';

export function resolveBedLabel(bedId: string, wards: WardBeds[]): string {
  if (!bedId) return '—';
  for (const ward of wards) {
    const bed = ward.beds.find((b) => b.id === bedId);
    if (bed) return `${bed.label} · ${ward.name}`;
  }
  return bedId;
}

export function resolveWardAndBed(
  bedId: string,
  wards: WardBeds[],
): { ward: string; bed: string } {
  if (!bedId) return { ward: '—', bed: '—' };
  for (const ward of wards) {
    const bed = ward.beds.find((b) => b.id === bedId);
    if (bed) return { ward: ward.name, bed: bed.label };
  }
  return { ward: '—', bed: bedId };
}
