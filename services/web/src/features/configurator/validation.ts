import { z } from 'zod';
import type { OrganizationType } from './types';

const organizationTypeEnum = z.enum([
  'hospital_chain',
  'medical_college',
  'standalone_hospital',
  'government_network',
]);

const organizationStatusEnum = z.enum(['active', 'suspended', 'decommissioned']);

export const organizationFormSchema = z
  .object({
    name: z.string().min(1, 'Name is required'),
    slug: z.string().min(3, 'Slug must be at least 3 characters'),
    type: organizationTypeEnum,
    status: organizationStatusEnum.optional(),
    contact_email: z.string().optional(),
    website: z.string().optional(),
    contact_phone: z.string().optional(),
    address: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const email = data.contact_email?.trim();
    // eslint-disable-next-line sonarjs/slow-regex -- linear regex on bounded/trusted input; the flagged quantifiers cannot catastrophically backtrack (#50 verified)
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invalid email',
        path: ['contact_email'],
      });
    }
    const website = data.website?.trim();
    if (website && !/^https?:\/\//i.test(website)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Website must start with http:// or https://',
        path: ['website'],
      });
    }
  });

export type OrganizationFormValues = z.infer<typeof organizationFormSchema>;

export const EMPTY_ORGANIZATION_FORM_VALUES: OrganizationFormValues = {
  name: '',
  slug: '',
  type: 'standalone_hospital',
  status: 'active',
  contact_email: '',
  website: '',
  contact_phone: '',
  address: '',
};

export const organizationTypeOptions: Array<{ value: OrganizationType; label: string }> = [
  { value: 'hospital_chain', label: 'Hospital chain' },
  { value: 'medical_college', label: 'Medical college' },
  { value: 'standalone_hospital', label: 'Standalone hospital' },
  { value: 'government_network', label: 'Government network' },
];
