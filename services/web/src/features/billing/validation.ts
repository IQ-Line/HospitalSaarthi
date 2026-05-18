import { z } from 'zod';

const optionalText = z.string().trim().optional().or(z.literal(''));
const optionalNullableText = z
  .union([z.string().trim(), z.literal(''), z.null()])
  .optional()
  .transform((v) => (v === '' || v === undefined ? null : v));

export const tariffServiceCreateSchema = z.object({
  service_code: z.string().trim().min(1, 'Service code is required').max(64),
  service_name: z.string().trim().min(1, 'Service name is required'),
  base_price: z.coerce.number().min(0, 'Base price must be >= 0'),
  tax_percentage: z.coerce.number().min(0).max(100),
  description: optionalNullableText,
  provider_id: z
    .union([z.string().uuid('Provider ID must be a valid UUID'), z.literal(''), z.null()])
    .optional()
    .transform((v) => (v === '' || v === undefined ? null : v)),
  department: optionalNullableText,
  category: optionalNullableText,
  sub_category: optionalNullableText,
  tax_type: optionalNullableText,
  is_active: z.boolean(),
  effective_from: optionalText,
  effective_to: optionalNullableText,
});

export const tariffServiceEditSchema = tariffServiceCreateSchema.omit({
  service_code: true,
  provider_id: true,
});

export type TariffServiceCreateFormValues = z.input<typeof tariffServiceCreateSchema>;
export type TariffServiceEditFormValues = z.input<typeof tariffServiceEditSchema>;

export const EMPTY_TARIFF_CREATE_VALUES: TariffServiceCreateFormValues = {
  service_code: '',
  service_name: '',
  base_price: 0,
  tax_percentage: 0,
  description: null,
  provider_id: null,
  department: null,
  category: null,
  sub_category: null,
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
  category: null,
  sub_category: null,
  tax_type: null,
  is_active: true,
  effective_from: '',
  effective_to: null,
};
