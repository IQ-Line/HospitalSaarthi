import { fromDatetimeLocalValue, toDatetimeLocalValue } from './format';
import type { ServiceCreateInput, ServiceUpdateInput, TariffService } from '../types';
import type { TariffServiceCreateFormValues } from '../validation';

export function serviceToFormValues(service: TariffService): TariffServiceCreateFormValues {
  return {
    service_code: service.service_code,
    service_name: service.service_name,
    base_price: Number(service.base_price),
    tax_percentage: Number(service.tax_percentage),
    description: service.description,
    provider_id: service.provider_id,
    department: service.department,
    category: service.category,
    sub_category: service.sub_category,
    tax_type: service.tax_type,
    is_active: service.is_active,
    effective_from: toDatetimeLocalValue(service.effective_from),
    effective_to: service.effective_to ? toDatetimeLocalValue(service.effective_to) : null,
  };
}

export function formToCreatePayload(values: TariffServiceCreateFormValues): ServiceCreateInput {
  return {
    service_code: values.service_code,
    service_name: values.service_name,
    base_price: values.base_price,
    tax_percentage: values.tax_percentage,
    description: values.description,
    provider_id: values.provider_id,
    department: values.department,
    category: values.category,
    sub_category: values.sub_category,
    tax_type: values.tax_type,
    is_active: values.is_active,
    effective_from: fromDatetimeLocalValue(values.effective_from),
    effective_to: values.effective_to
      ? (fromDatetimeLocalValue(values.effective_to) ?? null)
      : null,
  };
}

export function formToUpdatePayload(values: TariffServiceCreateFormValues): ServiceUpdateInput {
  return {
    service_name: values.service_name,
    base_price: values.base_price,
    tax_percentage: values.tax_percentage,
    description: values.description,
    department: values.department,
    category: values.category,
    sub_category: values.sub_category,
    tax_type: values.tax_type,
    is_active: values.is_active,
    effective_from: fromDatetimeLocalValue(values.effective_from),
    effective_to: values.effective_to
      ? (fromDatetimeLocalValue(values.effective_to) ?? null)
      : null,
  };
}
