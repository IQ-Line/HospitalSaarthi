import { describe, expect, it } from 'vitest';
import {
  formatMedicineSuggestionLabel,
  medicineDisplayNameFromCatalog,
} from './medicine-suggestions';
import type { VisitpadMedicine } from '@/features/visitpad/types';

function medicine(partial: Partial<VisitpadMedicine>): VisitpadMedicine {
  return {
    id: '1',
    iq_tenant_id: 'tenant',
    code: 'med-1',
    display_name: 'Paracetamol',
    generic_name: 'Paracetamol',
    brand_names: [],
    drug_class: 'Analgesic',
    dosage_form: 'Tablet',
    route_of_admin: ['oral'],
    strength_display: '500mg',
    expiry_tracking: false,
    is_dispensable: true,
    schedule: 'H',
    is_controlled_substance: false,
    is_narcotic: false,
    requires_prescription: false,
    is_restricted_antibiotic: false,
    allergen_classes: [],
    contraindications: [],
    search_tags: [],
    is_active: true,
    is_deleted: false,
    display_order: 0,
    created_at: '',
    updated_at: '',
    ...partial,
  };
}

describe('medicine-suggestions', () => {
  it('formats suggestion and stored display names', () => {
    const row = medicine({});
    expect(formatMedicineSuggestionLabel(row)).toBe('Paracetamol — 500mg');
    expect(medicineDisplayNameFromCatalog(row)).toBe('Paracetamol');
  });

  it('includes short name in suggestion label', () => {
    const row = medicine({ short_name: 'PCM' });
    expect(formatMedicineSuggestionLabel(row)).toBe('Paracetamol — 500mg (PCM)');
  });

  it('omits strength suffix when absent', () => {
    const row = medicine({ strength_display: '' });
    expect(formatMedicineSuggestionLabel(row)).toBe('Paracetamol');
    expect(medicineDisplayNameFromCatalog(row)).toBe('Paracetamol');
  });
});
