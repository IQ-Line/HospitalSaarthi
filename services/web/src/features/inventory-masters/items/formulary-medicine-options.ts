import type { VisitpadMedicine } from '@/features/visitpad/types';

export type FormularyMedicineOption = {
  formularyId: string;
  platformMedicineId: string | null;
  displayName: string;
  genericName: string;
  strength: string;
  dosageForm: string;
  drugClass: string;
  schedule: string;
  prescriptionRequired: boolean;
  skuCode: string;
  packSize: string;
  storageCondition: string;
  manufacturer: string;
  brandNames: string[];
};

function medicineDisplayName(medicine: VisitpadMedicine): string {
  const base = medicine.strength_display
    ? `${medicine.display_name} — ${medicine.strength_display}`
    : medicine.display_name;
  const short = medicine.short_name?.trim();
  return short ? `${base} (${short})` : base;
}

function packSizeLabel(medicine: VisitpadMedicine): string {
  if (medicine.pack_size != null && medicine.pack_unit?.trim()) {
    return `${medicine.pack_size} ${medicine.pack_unit.trim()}`;
  }
  if (medicine.pack_size != null) return String(medicine.pack_size);
  return '';
}

/** Maps tenant visitpad medicine catalog rows to item-master formulary picker options. */
export function buildFormularyMedicineOptions(medicines: VisitpadMedicine[]): FormularyMedicineOption[] {
  const out: FormularyMedicineOption[] = [];
  const seen = new Set<string>();

  for (const medicine of medicines) {
    if (!medicine.is_active || medicine.is_deleted) continue;
    const displayName = medicineDisplayName(medicine);
    const key = displayName.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    out.push({
      formularyId: medicine.id,
      platformMedicineId: null,
      displayName,
      genericName: medicine.generic_name?.trim() ?? '',
      strength: medicine.strength_display?.trim() ?? '',
      dosageForm: medicine.dosage_form?.trim() ?? '',
      drugClass: medicine.drug_class?.trim() ?? '',
      schedule: medicine.schedule?.trim() ?? '',
      prescriptionRequired: medicine.requires_prescription,
      skuCode: medicine.sku_code?.trim() ?? '',
      packSize: packSizeLabel(medicine),
      storageCondition: medicine.storage_condition?.trim() ?? '',
      manufacturer: medicine.manufacturer?.trim() ?? '',
      brandNames: medicine.brand_names ?? [],
    });
  }

  return out.sort((a, b) => a.displayName.localeCompare(b.displayName));
}
