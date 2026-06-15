import type { ImmunizationRow } from '../types';

/** Stored in vaccines_required.instructions when row has administration details. */
const IMMUNIZATION_META_PREFIX = '__hims_immunization_v1:';

export interface ImmunizationVaccinePayload {
  line_no: number;
  name: string;
  vaccine_code: string | null;
  instructions: string | null;
  due_by: string | null;
  status: string;
}

interface ImmunizationStoredMeta {
  manufacturer?: string;
  lotNumber?: string;
  dateOfDose?: string;
  doseNumber?: string;
  notes?: string;
}

function normalizeImmunizationDate(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(trimmed);
  return match ? match[1]! : trimmed.slice(0, 10);
}

function toIsoDateTime(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return `${trimmed}T12:00:00+05:30`;
  }
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function fromIsoDateTime(value: string | null | undefined): string {
  if (!value?.trim()) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value.trim();
  return parsed.toISOString().slice(0, 10);
}

function hasStoredMeta(row: ImmunizationRow): boolean {
  return Boolean(
    row.manufacturer.trim() ||
      row.lotNumber.trim() ||
      row.dateOfDose.trim() ||
      row.doseNumber.trim() ||
      row.notes.trim(),
  );
}

export function immunizationRowToVaccinePayload(
  row: ImmunizationRow,
  lineNo: number,
): ImmunizationVaccinePayload {
  const dueBy = toIsoDateTime(row.nextDueDate);
  if (!hasStoredMeta(row)) {
    return {
      line_no: lineNo,
      name: row.vaccineName,
      vaccine_code: null,
      instructions: row.notes.trim() || null,
      due_by: dueBy,
      status: 'pending',
    };
  }

  const meta: ImmunizationStoredMeta = {
    manufacturer: row.manufacturer.trim() || undefined,
    lotNumber: row.lotNumber.trim() || undefined,
    dateOfDose: normalizeImmunizationDate(row.dateOfDose) || undefined,
    doseNumber: row.doseNumber.trim() || undefined,
    notes: row.notes.trim() || undefined,
  };

  return {
    line_no: lineNo,
    name: row.vaccineName,
    vaccine_code: null,
    instructions: `${IMMUNIZATION_META_PREFIX}${JSON.stringify(meta)}`,
    due_by: dueBy,
    status: 'pending',
  };
}

export function vaccinePayloadToImmunizationRow(row: {
  name: string;
  instructions?: string | null;
  due_by?: string | null;
}): ImmunizationRow {
  const instructions = row.instructions?.trim() ?? '';
  const base: ImmunizationRow = {
    id: crypto.randomUUID(),
    vaccineName: row.name,
    manufacturer: '',
    lotNumber: '',
    dateOfDose: '',
    doseNumber: '',
    nextDueDate: fromIsoDateTime(row.due_by),
    notes: '',
  };

  if (!instructions.startsWith(IMMUNIZATION_META_PREFIX)) {
    return { ...base, notes: instructions };
  }

  try {
    const meta = JSON.parse(
      instructions.slice(IMMUNIZATION_META_PREFIX.length),
    ) as ImmunizationStoredMeta;
    return {
      ...base,
      manufacturer: meta.manufacturer?.trim() ?? '',
      lotNumber: meta.lotNumber?.trim() ?? '',
      dateOfDose: normalizeImmunizationDate(meta.dateOfDose?.trim() ?? ''),
      doseNumber: meta.doseNumber?.trim() ?? '',
      notes: meta.notes?.trim() ?? '',
    };
  } catch {
    return { ...base, notes: instructions };
  }
}
