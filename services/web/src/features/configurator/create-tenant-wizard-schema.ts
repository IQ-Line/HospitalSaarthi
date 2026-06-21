import { z } from 'zod';

export const NEW_ORGANISATION_VALUE = '__new__';

export const PLAN_OPTIONS = [
  { value: 'starter', label: 'Starter Plan' },
  { value: 'professional', label: 'Professional Plan' },
] as const;

export type PlanSlug = (typeof PLAN_OPTIONS)[number]['value'];

export const INDIAN_STATE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'Andhra Pradesh', label: 'Andhra Pradesh' },
  { value: 'Arunachal Pradesh', label: 'Arunachal Pradesh' },
  { value: 'Assam', label: 'Assam' },
  { value: 'Bihar', label: 'Bihar' },
  { value: 'Chhattisgarh', label: 'Chhattisgarh' },
  { value: 'Goa', label: 'Goa' },
  { value: 'Gujarat', label: 'Gujarat' },
  { value: 'Haryana', label: 'Haryana' },
  { value: 'Himachal Pradesh', label: 'Himachal Pradesh' },
  { value: 'Jharkhand', label: 'Jharkhand' },
  { value: 'Karnataka', label: 'Karnataka' },
  { value: 'Kerala', label: 'Kerala' },
  { value: 'Madhya Pradesh', label: 'Madhya Pradesh' },
  { value: 'Maharashtra', label: 'Maharashtra' },
  { value: 'Manipur', label: 'Manipur' },
  { value: 'Meghalaya', label: 'Meghalaya' },
  { value: 'Mizoram', label: 'Mizoram' },
  { value: 'Nagaland', label: 'Nagaland' },
  { value: 'Odisha', label: 'Odisha' },
  { value: 'Punjab', label: 'Punjab' },
  { value: 'Rajasthan', label: 'Rajasthan' },
  { value: 'Sikkim', label: 'Sikkim' },
  { value: 'Tamil Nadu', label: 'Tamil Nadu' },
  { value: 'Telangana', label: 'Telangana' },
  { value: 'Tripura', label: 'Tripura' },
  { value: 'Uttar Pradesh', label: 'Uttar Pradesh' },
  { value: 'Uttarakhand', label: 'Uttarakhand' },
  { value: 'West Bengal', label: 'West Bengal' },
  { value: 'Andaman and Nicobar Islands', label: 'Andaman and Nicobar Islands' },
  { value: 'Chandigarh', label: 'Chandigarh' },
  { value: 'Delhi', label: 'Delhi' },
  { value: 'Jammu and Kashmir', label: 'Jammu and Kashmir' },
  { value: 'Ladakh', label: 'Ladakh' },
  { value: 'Lakshadweep', label: 'Lakshadweep' },
  { value: 'Puducherry', label: 'Puducherry' },
];

const organizationTypeEnum = z.enum([
  'hospital_chain',
  'medical_college',
  'standalone_hospital',
  'government_network',
]);

const optionalWebsiteRefine = (
  website: string | undefined,
  ctx: z.RefinementCtx,
  path: string,
) => {
  const w = website?.trim();
  if (w && !/^https?:\/\//i.test(w)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Website must start with http:// or https://',
      path: [path],
    });
  }
};

export const createTenantStep0Schema = z
  .object({
    organisationSelectionId: z.string().min(1, 'Select an organisation'),
    organisationId: z.string().optional(),
    organisationName: z.string().optional(),
    organisationSlug: z.string().trim().min(3, 'Slug must be at least 3 characters'),
    organisationType: organizationTypeEnum,
    organisationWebsite: z.string().optional(),
    organisationEmail: z.string().optional(),
  })
  .superRefine((d, ctx) => {
    optionalWebsiteRefine(d.organisationWebsite, ctx, 'organisationWebsite');
    const email = d.organisationEmail?.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Enter a valid email address',
        path: ['organisationEmail'],
      });
    }
    if (d.organisationSelectionId === NEW_ORGANISATION_VALUE) {
      const name = d.organisationName?.trim();
      if (!name) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Organisation name is required',
          path: ['organisationName'],
        });
      }
    }
  });

export const createTenantStep1Schema = z
  .object({
    tenantName: z.string().min(1, 'Tenant name is required'),
    tenantSlug: z.string().trim().min(3, 'Slug must be at least 3 characters'),
    gstin: z.string().optional(),
    pan: z.string().optional(),
    hqAddressLine1: z.string().min(1, 'HQ address line 1 is required'),
    locality: z.string().optional(),
    block: z.string().optional(),
    district: z.string().min(1, 'District is required'),
    state: z.string().min(1, 'State is required'),
    pinCode: z.string().regex(/^[0-9]{6}$/, 'PIN code must be 6 digits'),
  })
  .superRefine((d, ctx) => {
    const g = d.gstin?.trim().toUpperCase();
    if (g && g.length !== 15) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'GSTIN must be 15 characters',
        path: ['gstin'],
      });
    }
    const p = d.pan?.trim().toUpperCase();
    if (p && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(p)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invalid PAN format (e.g. ABCDE1234F)',
        path: ['pan'],
      });
    }
  });

/** Modules step has no form fields; module selection is validated in the wizard shell. */
export const createTenantStep2Schema = z.object({});

export const createTenantStep3Schema = z
  .object({
    adminFirstName: z.string().min(1, 'First name is required'),
    adminLastName: z.string().optional(),
    adminUsername: z
      .string()
      .min(3, 'Username must be at least 3 characters')
      .max(30, 'Username must be at most 30 characters')
      .regex(/^[a-zA-Z0-9._]+$/, 'Use only letters, digits, "." or "_"'),
    adminEmail: z.union([z.literal(''), z.string().email('Enter a valid email')]),
    adminMobile: z.string().optional(),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Confirm the password'),
  })
  .superRefine((d, ctx) => {
    if (d.password !== d.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Passwords do not match',
        path: ['confirmPassword'],
      });
    }
    const mobile = d.adminMobile?.trim();
    if (mobile && mobile.length < 10) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Enter a valid mobile number',
        path: ['adminMobile'],
      });
    }
  });

export type WizardFormValues = z.infer<typeof createTenantStep0Schema> &
  z.infer<typeof createTenantStep1Schema> &
  z.infer<typeof createTenantStep2Schema> &
  z.infer<typeof createTenantStep3Schema>;

export const WIZARD_DEFAULT_VALUES: WizardFormValues = {
  organisationSelectionId: '',
  organisationId: '',
  organisationName: '',
  organisationSlug: '',
  organisationType: 'standalone_hospital',
  organisationWebsite: '',
  organisationEmail: '',
  tenantName: '',
  tenantSlug: '',
  gstin: '',
  pan: '',
  hqAddressLine1: '',
  locality: '',
  block: '',
  district: '',
  state: '',
  pinCode: '',
  adminFirstName: '',
  adminLastName: '',
  adminEmail: '',
  adminUsername: '',
  adminMobile: '',
  password: '',
  confirmPassword: '',
};
