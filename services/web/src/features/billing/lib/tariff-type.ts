/** Master Data picklist domain slug (`global_master.picklist`). */
export const TARIFF_TYPE_PICKLIST_SLUG = 'tariff-type';

export type TariffFormType = 'registration' | 'opd';

const VALUE_TO_TYPE: Record<string, TariffFormType> = {
  'registration-fee': 'registration',
  'consultation-fee': 'opd',
};

export function picklistValueToTariffType(value: string): TariffFormType {
  return VALUE_TO_TYPE[value] ?? 'opd';
}

export function tariffTypeToPicklistValue(type: TariffFormType): string {
  return type === 'registration' ? 'registration-fee' : 'consultation-fee';
}
