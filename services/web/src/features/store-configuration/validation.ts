import { z } from 'zod';

export const storeFormSchema = z.object({
  store_name: z.string().trim().min(1, 'Store name is required').max(200),
  store_type_id: z.string().uuid('Select a store type'),
  department_id: z.string().uuid('Select a department'),
  physical_location: z.string().max(500).optional().default(''),
  is_active: z.boolean().default(true),
  can_receive_stock: z.boolean().default(false),
  can_dispense: z.boolean().default(false),
  can_issue_to_ward: z.boolean().default(false),
  track_batch_expiry: z.boolean().default(true),
  indent_authority: z.boolean().default(false),
  indent_target_store_id: z.string().uuid().optional().or(z.literal('')),
  is_central_store: z.boolean().default(false),
}).superRefine((values, ctx) => {
  if (values.indent_authority && !values.indent_target_store_id?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Select an indent target store when indent authority is enabled.',
      path: ['indent_target_store_id'],
    });
  }
});

export type StoreFormValues = z.output<typeof storeFormSchema>;
export type StoreFormInput = z.input<typeof storeFormSchema>;

export const EMPTY_STORE_FORM_VALUES: StoreFormInput = {
  store_name: '',
  store_type_id: '',
  department_id: '',
  physical_location: '',
  is_active: true,
  can_receive_stock: false,
  can_dispense: false,
  can_issue_to_ward: false,
  track_batch_expiry: true,
  indent_authority: false,
  indent_target_store_id: '',
  is_central_store: false,
};
