import { fromDatetimeLocalValue, toDatetimeLocalValue } from './format';
import {
  isDoctorTariffMetadataDescription,
  userVisibleTariffDescription,
} from './doctor-tariff-meta';
import { TARIFF_PICKLIST_REGISTRATION_FEE } from './tariff-type';
import type { ServiceCreateInput, ServiceUpdateInput, TariffService } from '../types';
import {
  tariffServiceCreateSchema,
  tariffServiceEditSchema,
  type TariffServiceCreateFormValues,
  type TariffServiceEditFormValues,
} from '../validation';

function sharedEditFields(service: TariffService) {
  return {
    tariff_category: service.category,
    service_name: service.service_name,
    base_price: Number(service.base_price),
    tax_percentage: Number(service.tax_percentage),
    description: userVisibleTariffDescription(service.description),
    department_id: service.department_id,
    tax_type: service.tax_type,
    is_active: service.is_active,
    effective_from: toDatetimeLocalValue(service.effective_from),
    effective_to: service.effective_to ? toDatetimeLocalValue(service.effective_to) : null,
  };
}

export function serviceToEditFormValues(service: TariffService): TariffServiceEditFormValues {
  return sharedEditFields(service);
}

export function formToCreatePayload(values: TariffServiceCreateFormValues): ServiceCreateInput {
  const v = tariffServiceCreateSchema.parse(values);
  const isRegistrationFee = v.tariff_type === TARIFF_PICKLIST_REGISTRATION_FEE;
  return {
    service_code: v.service_code,
    service_name: v.service_name,
    base_price: v.base_price,
    tax_percentage: v.tax_percentage,
    description: v.description,
    provider_id: isRegistrationFee ? null : v.provider_id,
    department_id: isRegistrationFee ? null : v.department_id,
    category: v.tariff_type,
    sub_category: null,
    tax_type: v.tax_type,
    is_active: v.is_active,
    effective_from: fromDatetimeLocalValue(v.effective_from),
    effective_to: v.effective_to ? (fromDatetimeLocalValue(v.effective_to) ?? null) : null,
  };
}

export function formToUpdatePayload(
  values: TariffServiceEditFormValues,
  service: TariffService,
): ServiceUpdateInput {
  const v = tariffServiceEditSchema.parse(values);
  const payload: ServiceUpdateInput = {
    service_name: v.service_name,
    base_price: v.base_price,
    tax_percentage: v.tax_percentage,
    department_id: v.department_id,
    tax_type: v.tax_type,
    is_active: v.is_active,
    effective_from: fromDatetimeLocalValue(v.effective_from),
    effective_to: v.effective_to ? (fromDatetimeLocalValue(v.effective_to) ?? null) : null,
  };
  if (!isDoctorTariffMetadataDescription(service.description)) {
    payload.description = v.description;
  }
  return payload;
}

