/** Defaults for optional fields on `VisitpadMedicineCreate` (OpenAPI). */
export function withMedicineCreateDefaults(body: {
  code: string;
  display_name: string;
  generic_name: string;
  drug_class: string;
  dosage_form: string;
  schedule: string;
}): Record<string, unknown> {
  return {
    ...body,
    brand_names: [] as string[],
    route_of_admin: [] as string[],
    strength_display: '',
    allergen_classes: [] as string[],
    contraindications: [] as string[],
    search_tags: [] as string[],
    expiry_tracking: false,
    is_dispensable: true,
    is_controlled_substance: false,
    is_narcotic: false,
    requires_prescription: false,
    is_restricted_antibiotic: false,
    black_box_warning: false,
    display_order: 0,
    is_active: true,
  };
}
