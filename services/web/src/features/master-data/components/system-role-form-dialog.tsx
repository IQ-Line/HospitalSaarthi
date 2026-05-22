import { useEffect, useMemo, useRef } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm, type UseFormReturn } from 'react-hook-form';
import { Button } from '@pulse/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@pulse/ui/dialog';
import { Input } from '@pulse/ui/input';
import { Label } from '@pulse/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@pulse/ui/select';
import { Switch } from '@pulse/ui/switch';
import { Textarea } from '@pulse/ui/textarea';
import { useRoleTypePicklistValues } from '@/features/master-data/api';
import { toSlug } from '@/features/master-data/utils';
import {
  EMPTY_SYSTEM_ROLE_FORM_VALUES,
  systemRoleFormSchema,
  type SystemRoleFormInput,
  type SystemRoleFormValues,
} from '@/features/master-data/validation';
import type { SystemRole, SystemRoleCreateInput, SystemRoleUpdateInput } from '../types';

function formValuesToCreatePayload(values: SystemRoleFormValues): SystemRoleCreateInput {
  return {
    name: values.name,
    slug: values.slug,
    description: values.description,
    role_type: values.role_type,
    is_template: values.is_template,
    is_active: values.is_active,
  };
}

function formValuesToUpdatePayload(values: SystemRoleFormValues): SystemRoleUpdateInput {
  return {
    name: values.name,
    slug: values.slug,
    description: values.description,
    role_type: values.role_type,
    is_template: values.is_template,
    is_active: values.is_active,
  };
}

export function systemRoleToFormValues(role: SystemRole): SystemRoleFormValues {
  return {
    name: role.name,
    slug: role.slug,
    description: role.description,
    role_type: role.role_type ?? '',
    is_template: role.is_template,
    is_active: role.is_active,
  };
}

function RoleDetailsFields({
  form,
  dialogOpen,
  roleTypeLoading,
  roleTypeError,
  roleTypeOptions,
}: {
  form: UseFormReturn<SystemRoleFormInput, unknown, SystemRoleFormValues>;
  dialogOpen: boolean;
  roleTypeLoading: boolean;
  roleTypeError: unknown;
  roleTypeOptions: { value: string; label: string }[];
}) {
  const { register, control, watch, setValue, formState: { errors } } = form;
  const watchedName = watch('name');
  const watchedSlug = watch('slug');
  const prevNameRef = useRef(watchedName);

  useEffect(() => {
    if (dialogOpen) {
      prevNameRef.current = watchedName;
    }
    // Only re-sync baseline when the dialog opens, not on each keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialogOpen]);

  useEffect(() => {
    const nextSlug = toSlug(watchedName);
    const prevAutoSlug = toSlug(prevNameRef.current);
    const slugStillSynced = !watchedSlug?.trim() || watchedSlug === prevAutoSlug;
    if (slugStillSynced && nextSlug && nextSlug !== watchedSlug) {
      setValue('slug', nextSlug, { shouldDirty: true });
    }
    prevNameRef.current = watchedName;
  }, [watchedName, watchedSlug, setValue]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="role-editor-name">Name</Label>
          <Input id="role-editor-name" placeholder="e.g. Junior Nurse" {...register('name')} />
          {errors.name ? <p className="text-xs text-destructive">{errors.name.message}</p> : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="role-editor-slug">Slug</Label>
          <Input
            id="role-editor-slug"
            placeholder="e.g. junior-nurse"
            {...register('slug')}
          />
          {errors.slug ? <p className="text-xs text-destructive">{errors.slug.message}</p> : null}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Role type</Label>
        <Controller
          name="role_type"
          control={control}
          render={({ field }) => (
            <Select
              value={field.value || undefined}
              onValueChange={field.onChange}
              disabled={roleTypeLoading || !!roleTypeError}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    roleTypeLoading
                      ? 'Loading role types…'
                      : roleTypeError
                        ? 'Failed to load role types'
                        : 'Select role type'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {roleTypeOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.role_type ? (
          <p className="text-xs text-destructive">{errors.role_type.message}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="role-editor-description">Description (optional)</Label>
        <Textarea id="role-editor-description" rows={3} {...register('description')} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center justify-between rounded-md border px-3 py-2">
          <div>
            <p className="text-sm font-medium">Template role</p>
            <p className="text-xs text-muted-foreground">Marks this as a platform template.</p>
          </div>
          <Controller
            name="is_template"
            control={control}
            render={({ field }) => (
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
        </div>
        <div className="flex items-center justify-between rounded-md border px-3 py-2">
          <div>
            <p className="text-sm font-medium">Active</p>
            <p className="text-xs text-muted-foreground">Inactive roles are hidden from lists.</p>
          </div>
          <Controller
            name="is_active"
            control={control}
            render={({ field }) => (
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
        </div>
      </div>
    </div>
  );
}

type SystemRoleFormDialogBaseProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  submitLabel: string;
  isSubmitting?: boolean;
  defaultValues?: SystemRoleFormValues;
};

export type SystemRoleFormDialogProps =
  | (SystemRoleFormDialogBaseProps & {
      mode: 'create';
      onSubmit: (details: SystemRoleCreateInput) => void | Promise<void>;
    })
  | (SystemRoleFormDialogBaseProps & {
      mode: 'edit';
      onSubmit: (details: SystemRoleUpdateInput) => void | Promise<void>;
    });

export function SystemRoleFormDialog(props: SystemRoleFormDialogProps) {
  const {
    open,
    onOpenChange,
    mode,
    title,
    description,
    submitLabel,
    isSubmitting = false,
    defaultValues = EMPTY_SYSTEM_ROLE_FORM_VALUES,
    onSubmit,
  } = props;

  const {
    options: roleTypePicklistOptions,
    isLoading: roleTypeLoading,
    error: roleTypeError,
  } = useRoleTypePicklistValues({ enabled: open });

  const roleTypeOptions = useMemo(
    () =>
      roleTypePicklistOptions
        .filter((v) => v.is_active)
        .sort((a, b) => a.display_order - b.display_order)
        .map((v) => ({ value: v.value, label: v.label })),
    [roleTypePicklistOptions],
  );

  const form = useForm<SystemRoleFormInput, unknown, SystemRoleFormValues>({
    resolver: zodResolver(systemRoleFormSchema),
    defaultValues,
  });

  useEffect(() => {
    if (open) {
      form.reset(defaultValues);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset when dialog opens with new defaults
  }, [open, defaultValues]);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      form.reset(defaultValues);
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[min(88dvh,960px)] w-full max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <div className="shrink-0 space-y-3 border-b p-4 pb-3">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
        </div>

        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={form.handleSubmit((values) => {
            if (mode === 'create') {
              void onSubmit(formValuesToCreatePayload(values));
              return;
            }
            void onSubmit(formValuesToUpdatePayload(values));
          })}
        >
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            <RoleDetailsFields
              form={form}
              dialogOpen={open}
              roleTypeLoading={roleTypeLoading}
              roleTypeError={roleTypeError}
              roleTypeOptions={roleTypeOptions}
            />
          </div>

          <DialogFooter className="mx-0 mb-0 shrink-0 border-t px-4 py-3">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
