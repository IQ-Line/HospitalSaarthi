import { z } from 'zod';
import { tariffTypeRequiresProvider } from './lib/tariff-type';

const optionalText = z.string().trim().optional().or(z.literal(''));
const optionalNullableText = z
  .union([z.string().trim(), z.literal(''), z.null()])
  .optional()
  .transform((v) => (v === '' || v === undefined ? null : v));

const baseTariffFields = {
  service_name: z.string().trim().min(1, 'Service name is required'),
  base_price: z.coerce.number().min(0, 'Base price must be >= 0'),
  tax_percentage: z.coerce.number().min(0).max(100),
  description: optionalNullableText,
  tax_type: optionalNullableText,
  is_active: z.boolean(),
  effective_from: optionalText,
  effective_to: optionalNullableText,
};

export const tariffServiceCreateSchema = z
  .object({
    service_code: z.string().trim().min(1, 'Service code is required').max(64),
    tariff_type: z.string().trim().min(1, 'Tariff type is required'),
    department_id: z
      .union([z.string().uuid(), z.literal(''), z.null()])
      .optional()
      .transform((v) => (v === '' || v === undefined ? null : v)),
    provider_id: z
      .union([z.string().uuid('Doctor must be a valid UUID'), z.literal(''), z.null()])
      .optional()
      .transform((v) => (v === '' || v === undefined ? null : v)),
    ...baseTariffFields,
  })
  .superRefine((v, ctx) => {
    if (!tariffTypeRequiresProvider(v.tariff_type)) return;
    if (!v.department_id) {
      ctx.addIssue({ code: 'custom', path: ['department_id'], message: 'Department is required' });
    }
    if (!v.provider_id) {
      ctx.addIssue({ code: 'custom', path: ['provider_id'], message: 'Doctor is required' });
    }
  });

export const tariffServiceEditSchema = z.object({
  department: optionalNullableText,
  ...baseTariffFields,
});

export type TariffServiceCreateFormValues = z.input<typeof tariffServiceCreateSchema>;
export type TariffServiceEditFormValues = z.input<typeof tariffServiceEditSchema>;

export const EMPTY_TARIFF_CREATE_VALUES: TariffServiceCreateFormValues = {
  service_code: '',
  service_name: '',
  tariff_type: 'registration-fee',
  department_id: null,
  provider_id: null,
  base_price: 0,
  tax_percentage: 0,
  description: null,
  tax_type: null,
  is_active: true,
  effective_from: '',
  effective_to: null,
};

export const EMPTY_TARIFF_EDIT_VALUES: TariffServiceEditFormValues = {
  service_name: '',
  base_price: 0,
  tax_percentage: 0,
  description: null,
  department: null,
  tax_type: null,
  is_active: true,
  effective_from: '',
  effective_to: null,
};
