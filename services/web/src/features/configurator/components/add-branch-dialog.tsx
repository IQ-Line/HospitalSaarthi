import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@pulse/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@pulse/ui/dialog';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@pulse/ui/field';
import { Input } from '@pulse/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@pulse/ui/select';
import { useCreateTenant } from '@/features/configurator/api';
import type { ConfiguratorBranchType, CreateConfiguratorTenantInput } from '@/features/configurator/types';
import { mutationErrorMessage } from '@/features/master-data/mutation-error';
import { toast } from 'sonner';

const branchTypeOptions: Array<{ value: ConfiguratorBranchType; label: string }> = [
  { value: 'hub_lab', label: 'Hub Lab' },
  { value: 'hub', label: 'Hub' },
  { value: 'satellite', label: 'Satellite' },
];

const parentHubOptions = [
  { value: 'Hub', label: 'Hub' },
  { value: 'Satellite', label: 'Satellite' },
] as const;

const addBranchSchema = z.object({
  name: z.string().min(1, 'Branch name is required'),
  branch_code: z
    .string()
    .trim()
    .min(2, 'Code must be at least 2 characters')
    .max(10, 'Code must be at most 10 characters')
    .regex(/^[A-Za-z0-9-]+$/, 'Use letters, digits, and hyphens only'),
  branch_type: z.enum(['hub_lab', 'hub', 'satellite']),
  parent_hub: z.enum(['Hub', 'Satellite']).optional(),
  address_line1: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pin_code: z.string().optional(),
  contact_phone: z.string().optional(),
  contact_email: z.union([z.literal(''), z.string().email()]).optional(),
});

export type AddBranchFormValues = z.infer<typeof addBranchSchema>;

export function branchTenantSlug(orgSlug: string, branchCode: string): string {
  const normalized = branchCode
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const safeOrg = orgSlug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${safeOrg}-${normalized.toLowerCase()}`;
}

interface AddBranchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  organizationSlug: string;
  parentTenantId: string;
}

export function AddBranchDialog({
  open,
  onOpenChange,
  organizationId,
  organizationSlug,
  parentTenantId,
}: AddBranchDialogProps) {
  const createTenant = useCreateTenant();

  const form = useForm<AddBranchFormValues>({
    resolver: zodResolver(addBranchSchema),
    defaultValues: {
      name: '',
      branch_code: '',
      branch_type: 'hub_lab',
      parent_hub: 'Hub',
      address_line1: '',
      city: '',
      state: '',
      pin_code: '',
      contact_phone: '',
      contact_email: '',
    },
  });

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = form;

  const onSubmit = handleSubmit(async (values) => {
    const code = values.branch_code.trim().toUpperCase();
    const slug = branchTenantSlug(organizationSlug, code);
    const email = values.contact_email?.trim();
    const meta: Record<string, unknown> = {};
    if (values.parent_hub) meta.parent_hub = values.parent_hub;

    const payload: CreateConfiguratorTenantInput = {
      org_id: organizationId,
      parent_tenant_id: parentTenantId,
      name: values.name.trim(),
      slug,
      type: 'lite',
      cerbos_scope_key: `tenant:${organizationId}:${slug}`,
      branch_code: code,
      branch_type: values.branch_type,
      address_line1: values.address_line1?.trim() || null,
      city: values.city?.trim() || null,
      state: values.state?.trim() || null,
      pin_code: values.pin_code?.trim() || null,
      contact_phone: values.contact_phone?.trim() || null,
      contact_email: email && email.length > 0 ? email : null,
      metadata: Object.keys(meta).length > 0 ? meta : undefined,
    };

    try {
      await createTenant.mutateAsync(payload);
      toast.success('Branch created');
      reset();
      onOpenChange(false);
    } catch (e) {
      toast.error(mutationErrorMessage(e));
    }
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent
        showCloseButton
        className="flex max-h-[min(90vh,40rem)] w-full max-w-lg flex-col gap-0 overflow-hidden border bg-background p-0 sm:rounded-xl"
      >
        <div className="shrink-0 space-y-1 border-b px-6 pb-4 pt-6 pr-14">
          <DialogHeader className="gap-1 space-y-0 text-left">
            <DialogTitle>Add branch</DialogTitle>
            <DialogDescription className="text-xs leading-relaxed">
              Create a branch for this tenant. Branch code is immutable after creation.
            </DialogDescription>
          </DialogHeader>
        </div>
        <form
          onSubmit={(e) => void onSubmit(e)}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-4">
            <FieldGroup className="gap-3 text-sm">
              <Field>
                <FieldLabel htmlFor="br-name">
                  Branch name <span className="text-destructive">*</span>
                </FieldLabel>
                <FieldContent>
                  <Input id="br-name" className="h-9 text-sm" placeholder="Main Laboratory" {...register('name')} />
                  <FieldError errors={errors.name ? [errors.name] : undefined} />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel htmlFor="br-code">
                  Branch code <span className="text-destructive">*</span>
                </FieldLabel>
                <FieldContent>
                  <Input
                    id="br-code"
                    className="h-9 font-mono text-sm uppercase"
                    placeholder="MUM-01"
                    {...register('branch_code')}
                  />
                  <FieldDescription>Uppercase alphanumeric + hyphen, 2–10 characters.</FieldDescription>
                  <FieldError errors={errors.branch_code ? [errors.branch_code] : undefined} />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel id="br-type-label">
                  Type <span className="text-destructive">*</span>
                </FieldLabel>
                <FieldContent>
                  <Controller
                    name="branch_type"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="h-9 text-sm" aria-labelledby="br-type-label">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {branchTypeOptions.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <FieldError errors={errors.branch_type ? [errors.branch_type] : undefined} />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel id="br-parent-label">Parent hub</FieldLabel>
                <FieldContent>
                  <Controller
                    name="parent_hub"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value ?? 'Hub'}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger className="h-9 text-sm" aria-labelledby="br-parent-label">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {parentHubOptions.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel htmlFor="br-addr">Address</FieldLabel>
                <FieldContent>
                  <Input id="br-addr" className="h-9 text-sm" placeholder="Line 1, area" {...register('address_line1')} />
                </FieldContent>
              </Field>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Field>
                  <FieldLabel htmlFor="br-city">City</FieldLabel>
                  <FieldContent>
                    <Input id="br-city" className="h-9 text-sm" {...register('city')} />
                  </FieldContent>
                </Field>
                <Field>
                  <FieldLabel htmlFor="br-state">State</FieldLabel>
                  <FieldContent>
                    <Input id="br-state" className="h-9 text-sm" {...register('state')} />
                  </FieldContent>
                </Field>
                <Field>
                  <FieldLabel htmlFor="br-pin">PIN</FieldLabel>
                  <FieldContent>
                    <Input id="br-pin" className="h-9 text-sm" {...register('pin_code')} />
                  </FieldContent>
                </Field>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="br-phone">Contact phone</FieldLabel>
                  <FieldContent>
                    <Input id="br-phone" className="h-9 text-sm" {...register('contact_phone')} />
                  </FieldContent>
                </Field>
                <Field>
                  <FieldLabel htmlFor="br-email">Contact email</FieldLabel>
                  <FieldContent>
                    <Input id="br-email" className="h-9 text-sm" type="email" {...register('contact_email')} />
                    <FieldError errors={errors.contact_email ? [errors.contact_email] : undefined} />
                  </FieldContent>
                </Field>
              </div>
            </FieldGroup>
          </div>
          <div className="flex shrink-0 flex-col-reverse gap-2 border-t bg-background px-6 py-4 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createTenant.isPending}
              className="bg-[#008C9E] text-white hover:bg-[#00798a]"
            >
              {createTenant.isPending ? 'Creating…' : 'Create branch'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
