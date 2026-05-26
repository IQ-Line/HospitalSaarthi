/** Master Data picklist slug (`global_master.picklist`). */
export const TARIFF_TYPE_PICKLIST_SLUG = 'tariff-type';

/** Picklist `value` for registration (no department/doctor on create). */
export const TARIFF_PICKLIST_REGISTRATION_FEE = 'registration-fee';

export function tariffTypeRequiresProvider(picklistValue: string): boolean {
  return picklistValue !== TARIFF_PICKLIST_REGISTRATION_FEE;
}
