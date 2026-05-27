import { describe, expect, it } from 'vitest';
import type { TariffService } from '@/features/billing/types';
import {
  pickConsultationTariff,
  pickRegistrationTariff,
} from '@/features/frontdesk/lib/resolve-registration-tariff';

function row(partial: Partial<TariffService> & Pick<TariffService, 'service_code'>): TariffService {
  return {
    id: partial.id ?? '00000000-0000-4000-8000-000000000001',
    iq_tenant_id: partial.iq_tenant_id ?? '00000000-0000-4000-8000-000000000099',
    service_name: partial.service_name ?? partial.service_code,
    description: null,
    provider_id: partial.provider_id ?? null,
    department: partial.department ?? null,
    category: partial.category ?? null,
    sub_category: null,
    tax_type: null,
    base_price: partial.base_price ?? '100.0000',
    tax_percentage: partial.tax_percentage ?? '0.0000',
    is_active: partial.is_active ?? true,
    effective_from: '2026-01-01T00:00:00.000Z',
    effective_to: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    created_by: null,
    updated_by: null,
    ...partial,
  };
}

describe('pickRegistrationTariff', () => {
  it('prefers frontdesk rack registration-fee row', () => {
    const picked = pickRegistrationTariff([
      row({ service_code: 'REG_OTHER', category: 'registration-fee', department: 'opd' }),
      row({ service_code: 'REG_FEE', category: 'registration-fee', department: 'frontdesk' }),
    ]);
    expect(picked?.service_code).toBe('REG_FEE');
  });
});

describe('pickConsultationTariff', () => {
  const doctorId = 'ae4993dd-f6c4-49a5-ba97-f8320fd0aac3';

  it('prefers doctor-specific consultation row in department', () => {
    const picked = pickConsultationTariff(
      [
        row({
          service_code: 'CONS_GENERAL',
          category: 'consultation-fee',
          department: 'cariology',
          provider_id: null,
          base_price: '400.0000',
        }),
        row({
          service_code: 'TAF123',
          category: 'consultation-fee',
          department: 'cariology',
          provider_id: doctorId,
          base_price: '105.0000',
        }),
      ],
      doctorId,
      'cariology',
    );
    expect(picked?.service_code).toBe('TAF123');
    expect(picked?.provider_id).toBe(doctorId);
  });
});
