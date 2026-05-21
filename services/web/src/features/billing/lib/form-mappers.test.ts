import { describe, expect, it } from 'vitest';
import { formToCreatePayload } from './form-mappers';
import type { TariffServiceCreateFormValues } from '../validation';

const baseValues: TariffServiceCreateFormValues = {
  service_code: 'CONS_GENERAL',
  service_name: 'General consultation',
  base_price: 500,
  tax_percentage: 0,
  description: null,
  provider_id: null,
  department: 'opd',
  category: 'consultation',
  sub_category: null,
  tax_type: null,
  is_active: true,
  effective_from: '2026-01-01T10:00',
  effective_to: null,
};

describe('formToCreatePayload', () => {
  it('maps department and category from unified create form fields', () => {
    const payload = formToCreatePayload(baseValues);
    expect(payload.department).toBe('opd');
    expect(payload.category).toBe('consultation');
    expect(payload.sub_category).toBeNull();
  });

  it('forces registration defaults when category is registration', () => {
    const payload = formToCreatePayload({
      ...baseValues,
      category: 'registration',
      department: 'ignored',
      provider_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d482',
    });
    expect(payload.category).toBe('registration');
    expect(payload.department).toBe('frontdesk');
    expect(payload.provider_id).toBeNull();
  });
});
