import { useEffect, useMemo, useRef, useState } from 'react';
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
import { RolePermissionsPanel } from '@/features/master-data/components/role-permissions-panel';
import { toSlug } from '@/features/master-data/utils';
import {
  EMPTY_SYSTEM_ROLE_FORM_VALUES,
  systemRoleFormSchema,
  type SystemRoleFormInput,
  type SystemRoleFormValues,
} from '@/features/master-data/validation';
import type { SystemRole, SystemRoleCreateInput, SystemRoleUpdateInput } from '../types';

type EditorTab = 'details' | 'permissions';

function formValuesToCreatePayload(values: SystemRoleFormValues): SystemRoleCreateInput {
  return {
    name: values.name,
    slug: values.slug,
    description: values.description,
    role_type: values.role_type,
    module_permission_ids:
      values.module_permission_ids.length > 0 ? values.module_permission_ids : null,
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
    module_permission_ids:
      values.module_permission_ids.length > 0 ? values.module_permission_ids : null,
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
    module_permission_ids: role.module_permission_ids ?? [],
    is_template: role.is_template,
    is_active: role.is_active,
  };
}

function RoleEditorTabBar({
  tab,
  onTabChange,
}: {
  tab: EditorTab;
  onTabChange: (tab: EditorTab) => void;
}) {
  const tabs: { id: EditorTab; label: string }[] = [
    { id: 'details', label: 'Role Settings' },
    { id: 'permissions', label: 'Permissions' },
  ];
  return (
    <div className="inline-flex rounded-full bg-muted p-1">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          className={
            tab === t.id
              ? 'rounded-full bg-background px-4 py-1.5 text-sm font-semibold text-foreground shadow-sm transition-colors'
              : 'rounded-full px-4 py-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground'
          }
          onClick={() => onTabChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
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

export interface SystemRoleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  title: string;
  description: string;
  submitLabel: string;
  isSubmitting?: boolean;
  defaultValues?: SystemRoleFormValues;
  /** Configurator tenant id — permissions tab lists modules from ``tenant_modules`` entitlements. */
  configuratorTenantId?: string;
  onSubmit: (payload: SystemRoleCreateInput | SystemRoleUpdateInput) => void;
}

export function SystemRoleFormDialog({
  open,
  onOpenChange,
  mode,
  title,
  description,
  submitLabel,
  isSubmitting = false,
  defaultValues = EMPTY_SYSTEM_ROLE_FORM_VALUES,
  configuratorTenantId,
  onSubmit,
}: SystemRoleFormDialogProps) {
  const [tab, setTab] = useState<EditorTab>('details');
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
      setTab('details');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset when dialog opens with new defaults
  }, [open, defaultValues]);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setTab('details');
      form.reset(defaultValues);
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[min(88dvh,960px)] w-full max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <div className="shrink-0 space-y-3 border-b p-4 pb-3">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <RoleEditorTabBar tab={tab} onTabChange={setTab} />
        </div>

        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={form.handleSubmit((values) => {
            onSubmit(mode === 'create' ? formValuesToCreatePayload(values) : formValuesToUpdatePayload(values));
          })}
        >
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            {tab === 'details' ? (
              <RoleDetailsFields
                form={form}
                dialogOpen={open}
                roleTypeLoading={roleTypeLoading}
                roleTypeError={roleTypeError}
                roleTypeOptions={roleTypeOptions}
              />
            ) : (
              <RolePermissionsPanel
                form={form}
                enabled={open && tab === 'permissions'}
                configuratorTenantId={configuratorTenantId}
              />
            )}
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
