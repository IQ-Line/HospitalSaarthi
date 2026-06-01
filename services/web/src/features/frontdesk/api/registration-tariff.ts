import { listTariffServices } from '@/features/billing/api/tariff-client';
import {
  LEGACY_REGISTRATION_CATEGORY,
  pickRegistrationTariff,
} from '@/features/frontdesk/lib/resolve-registration-tariff';
import { TARIFF_PICKLIST_REGISTRATION_FEE } from '@/features/billing/lib/tariff-type';
import type { TariffService } from '@/features/billing/types';

/** Load the tenant's active registration rack rate (picklist + legacy categories). */
export async function fetchActiveRegistrationTariff(
  iqTenantId?: string,
): Promise<TariffService | null> {
  const [modern, legacy] = await Promise.all([
    listTariffServices(
      { is_active: true, category: TARIFF_PICKLIST_REGISTRATION_FEE, limit: 20 },
      iqTenantId,
    ),
    listTariffServices(
      { is_active: true, category: LEGACY_REGISTRATION_CATEGORY, limit: 20 },
      iqTenantId,
    ),
  ]);

  return pickRegistrationTariff([...modern.data, ...legacy.data]);
}
