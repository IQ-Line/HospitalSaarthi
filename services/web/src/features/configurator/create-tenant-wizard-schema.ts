import { z } from 'zod';

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

const tenantTypeEnum = z.enum([
  'hospital_chain',
  'medical_college',
  'standalone_hospital',
  'government_network',
]);

export const createTenantStep1Schema = z
  .object({
    tenantName: z.string().min(1, 'Tenant name is required'),
    slug: z.string().trim().min(3, 'Slug must be at least 3 characters'),
    tenantType: tenantTypeEnum,
    gstin: z.string().optional(),
    pan: z.string().optional(),
    website: z.string().optional(),
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
    const w = d.website?.trim();
    if (w && !/^https?:\/\//i.test(w)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Website must start with http:// or https://',
        path: ['website'],
      });
    }
  });

export const createTenantStep2Schema = z
  .object({
    planSlug: z.enum(['starter', 'professional']),
    trialEndDate: z.string().optional(),
    maxUsersOverride: z.string().optional(),
    maxBranchesOverride: z.string().optional(),
  })
  .superRefine((d, ctx) => {
    const t = d.trialEndDate?.trim();
    if (t && Number.isNaN(Date.parse(t))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invalid trial end date',
        path: ['trialEndDate'],
      });
    }
    const mu = d.maxUsersOverride?.trim();
    if (mu && (Number.isNaN(Number(mu)) || Number(mu) < 1)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Max users must be a positive number',
        path: ['maxUsersOverride'],
      });
    }
    const mb = d.maxBranchesOverride?.trim();
    if (mb && (Number.isNaN(Number(mb)) || Number(mb) < 1)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Max branches must be a positive number',
        path: ['maxBranchesOverride'],
      });
    }
  });

export const createTenantStep3Schema = z
  .object({
    adminFirstName: z.string().min(1, 'First name is required'),
    adminLastName: z.string().min(1, 'Last name is required'),
    adminEmail: z.string().email('Valid admin email is required'),
    adminMobile: z.string().min(10, 'Enter a valid mobile number'),
    sendInvitation: z.boolean(),
    password: z.string().optional(),
    confirmPassword: z.string().optional(),
    welcomeMessage: z.string().max(500).optional(),
  })
  .superRefine((d, ctx) => {
    if (!d.sendInvitation) {
      const pw = d.password ?? '';
      if (pw.length < 8) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Password must be at least 8 characters when not sending invite',
          path: ['password'],
        });
      }
      if (pw !== (d.confirmPassword ?? '')) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Passwords do not match',
          path: ['confirmPassword'],
        });
      }
    }
  });

export type WizardFormValues = z.infer<typeof createTenantStep1Schema> &
  z.infer<typeof createTenantStep2Schema> &
  z.infer<typeof createTenantStep3Schema>;

export const WIZARD_DEFAULT_VALUES: WizardFormValues = {
  tenantName: '',
  slug: '',
  tenantType: 'standalone_hospital',
  gstin: '',
  pan: '',
  website: '',
  hqAddressLine1: '',
  locality: '',
  block: '',
  district: '',
  state: '',
  pinCode: '',
  planSlug: 'starter',
  trialEndDate: '',
  maxUsersOverride: '',
  maxBranchesOverride: '',
  adminFirstName: '',
  adminLastName: '',
  adminEmail: '',
  adminMobile: '',
  sendInvitation: true,
  password: '',
  confirmPassword: '',
  welcomeMessage: '',
};
