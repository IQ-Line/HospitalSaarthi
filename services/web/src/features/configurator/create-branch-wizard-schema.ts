import { z } from 'zod';
import { createTenantStep2Schema, createTenantStep3Schema } from './create-tenant-wizard-schema';

/** Applied on create; not collected in the branch wizard UI. */
export const DEFAULT_BRANCH_TYPE = 'satellite' as const;

export const createBranchStep1Schema = z
  .object({
    branchName: z.string().min(1, 'Branch name is required'),
    branchCode: z
      .string()
      .trim()
      .min(2, 'Code must be at least 2 characters')
      .max(10, 'Code must be at most 10 characters')
      .regex(/^[A-Za-z0-9-]+$/, 'Use letters, digits, and hyphens only'),
    gstin: z.string().optional(),
    pan: z.string().optional(),
    hqAddressLine1: z.string().min(1, 'Address is required'),
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

export const createBranchStep2Schema = createTenantStep2Schema;
export const createBranchStep3Schema = createTenantStep3Schema;

export type BranchWizardFormValues = z.infer<typeof createBranchStep1Schema> &
  z.infer<typeof createBranchStep2Schema> &
  z.infer<typeof createBranchStep3Schema>;

export const BRANCH_WIZARD_DEFAULT_VALUES: BranchWizardFormValues = {
  branchName: '',
  branchCode: '',
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
