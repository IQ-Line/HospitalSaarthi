import { z } from 'zod';

export const moduleCategorySchema = z.enum([
  'core',
  'clinical',
  'administrative',
  'support',
]);

export const permissionActionSchema = z.enum([
  'create',
  'read',
  'update',
  'delete',
  'manage',
]);

const nullableText = z
  .string()
  .max(1000, 'Description is too long.')
  .optional()
  .nullable()
  .transform((value) => {
    if (!value) return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  });

const requiredString = (label: string, max = 120) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required.`)
    .max(max, `${label} must be ${max} characters or less.`);

export const moduleFormSchema = z.object({
  name: requiredString('Name', 100),
  slug: requiredString('Slug', 150),
  category: moduleCategorySchema,
  version: z
    .string()
    .trim()
    .max(40, 'Version must be 40 characters or less.')
    .default('0.0.0'),
  description: nullableText,
  parent_id: z.string().uuid().nullable().optional(),
  icon: z
    .string()
    .max(120, 'Icon must be 120 characters or less.')
    .optional()
    .nullable()
    .transform((value) => {
      if (!value) return null;
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : null;
    }),
  is_active: z.boolean().default(true),
});

export const permissionFormSchema = z.object({
  name: requiredString('Name', 120),
  slug: requiredString('Slug', 150),
  action: permissionActionSchema,
  description: nullableText,
  is_active: z.boolean().default(true),
});

export const systemRoleFormSchema = z.object({
  name: requiredString('Name', 120),
  slug: requiredString('Slug', 150),
  description: nullableText,
  is_template: z.boolean().default(true),
  is_active: z.boolean().default(true),
});

export const modulePermissionFormSchema = z.object({
  slug: requiredString('Slug', 180),
  module_id: z.string().uuid('Select a module.'),
  permission_id: z.string().uuid('Select a permission.'),
  is_default: z.boolean().default(false),
  is_active: z.boolean().default(true),
});

export const modulePermissionUpdateSchema = z.object({
  slug: requiredString('Slug', 180),
  is_default: z.boolean().default(false),
  is_active: z.boolean().default(true),
});

export type ModuleFormValues = z.infer<typeof moduleFormSchema>;
export type PermissionFormValues = z.infer<typeof permissionFormSchema>;
export type SystemRoleFormValues = z.infer<typeof systemRoleFormSchema>;
export type ModulePermissionFormValues = z.infer<typeof modulePermissionFormSchema>;
export type ModulePermissionUpdateValues = z.infer<typeof modulePermissionUpdateSchema>;
