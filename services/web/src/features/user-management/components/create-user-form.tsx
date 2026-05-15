import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from '@tanstack/react-router';
import { useMemo } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { Button } from '@pulse/ui/button';
import type { CreateUserBody } from '../types';
import { useCreateUser } from '../api/mutations';
import { capabilityListOptions, roleCapabilitiesOptions, roleListOptions } from '../api/queries';
import {
  createUserFormSchema,
  CreateUserAccessSection,
  CreateUserIdentitySection,
  CreateUserOrganizationSection,
  type CreateUserFormValues,
} from './create-user-form-sections';

function toBody(values: CreateUserFormValues, canManageAccess: boolean): CreateUserBody {
  return {
    full_name: values.full_name,
    email: values.email.trim(),
    password: values.password,
    phone: values.phone === '' ? null : values.phone,
    username: values.username === '' ? null : values.username,
    org_id: values.org_id === '' ? null : values.org_id,
    department: values.department === '' ? null : values.department,
    clearance_tier_required: values.clearance_tier_required,
    capability_ids: canManageAccess ? values.capability_ids : [],
    role_template_ids: canManageAccess ? values.role_template_ids : [],
  };
}

type CreateUserFormProps = {
  canReadRoleTemplates: boolean;
  canReadCapabilities: boolean;
  canManageAccess: boolean;
  layout?: 'page' | 'dialog';
  onCancel?: () => void;
};

export function CreateUserForm({
  canReadRoleTemplates,
  canReadCapabilities,
  canManageAccess,
  layout = 'page',
  onCancel,
}: CreateUserFormProps) {
  const navigate = useNavigate();
  const create = useCreateUser();
  const rolesQuery = useQuery({
    ...roleListOptions(),
    enabled: canReadRoleTemplates,
    staleTime: 30_000,
  });
  const capabilitiesQuery = useQuery({
    ...capabilityListOptions(),
    enabled: canReadCapabilities,
    staleTime: 30_000,
  });
  const form = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserFormSchema),
    defaultValues: {
      full_name: '',
      email: '',
      password: '',
      phone: '',
      username: '',
      org_id: '',
      department: '',
      clearance_tier_required: 0,
      role_template_ids: [],
      capability_ids: [],
    },
  });
  const selectedRoleTemplateIds = form.watch('role_template_ids');
  const selectedCapabilityIds = form.watch('capability_ids');
  const availableRoles = (rolesQuery.data ?? []).filter((role) => role.status === 'active');
  const availableCapabilities = capabilitiesQuery.data ?? [];

  const templateCapabilityQueries = useQueries({
    queries: selectedRoleTemplateIds.map((roleId) => ({
      ...roleCapabilitiesOptions(roleId),
      enabled: canReadCapabilities && canReadRoleTemplates,
      staleTime: 30_000,
    })),
  });

  const copiedCapabilities = useMemo(() => {
    const byId = new Map<string, (typeof availableCapabilities)[number]>();
    for (const query of templateCapabilityQueries) {
      for (const capability of query.data ?? []) {
        byId.set(capability.id, capability);
      }
    }
    return [...byId.values()].toSorted((left, right) =>
      left.display_name.localeCompare(right.display_name),
    );
  }, [availableCapabilities, templateCapabilityQueries]);

  const effectiveCapabilities = useMemo(() => {
    const byId = new Map<string, (typeof availableCapabilities)[number]>();
    const selectedCapabilityIdSet = new Set(selectedCapabilityIds);
    for (const capability of copiedCapabilities) {
      byId.set(capability.id, capability);
    }
    for (const capability of availableCapabilities) {
      if (selectedCapabilityIdSet.has(capability.id)) {
        byId.set(capability.id, capability);
      }
    }
    return [...byId.values()].toSorted((left, right) =>
      left.display_name.localeCompare(right.display_name),
    );
  }, [availableCapabilities, copiedCapabilities, selectedCapabilityIds]);

  const onSubmit = form.handleSubmit((values) => {
    create.mutate(toBody(values, canManageAccess), {
      onSuccess: (user) => {
        void navigate({
          to: '/user-management/$userId',
          params: { userId: user.id },
        });
      },
    });
  });

  const toggleRoleTemplate = (roleId: string) => {
    const next = selectedRoleTemplateIds.includes(roleId)
      ? selectedRoleTemplateIds.filter((id) => id !== roleId)
      : [...selectedRoleTemplateIds, roleId];
    form.setValue('role_template_ids', next, { shouldDirty: true, shouldValidate: true });
  };

  const toggleCapability = (capabilityId: string) => {
    const next = selectedCapabilityIds.includes(capabilityId)
      ? selectedCapabilityIds.filter((id) => id !== capabilityId)
      : [...selectedCapabilityIds, capabilityId];
    form.setValue('capability_ids', next, { shouldDirty: true, shouldValidate: true });
  };

  const isDialog = layout === 'dialog';

  return (
    <form
      onSubmit={onSubmit}
      className={isDialog ? 'flex min-h-0 flex-1 flex-col' : 'mx-auto max-w-5xl space-y-6'}
    >
      <div
        className={
          isDialog
            ? 'min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-y-contain px-1 py-1'
            : 'space-y-6'
        }
      >
        <CreateUserIdentitySection
          register={form.register}
          errors={form.formState.errors}
        />

        <CreateUserOrganizationSection
          register={form.register}
          errors={form.formState.errors}
          control={form.control}
        />

        <CreateUserAccessSection
          canReadRoleTemplates={canReadRoleTemplates}
          canReadCapabilities={canReadCapabilities}
          canManageAccess={canManageAccess}
          roleTemplates={availableRoles}
          roleTemplatesPending={rolesQuery.isPending}
          roleTemplatesError={rolesQuery.isError}
          capabilities={availableCapabilities}
          capabilitiesPending={capabilitiesQuery.isPending}
          capabilitiesError={capabilitiesQuery.isError}
          selectedRoleTemplateIds={selectedRoleTemplateIds}
          selectedCapabilityIds={selectedCapabilityIds}
          copiedCapabilities={copiedCapabilities}
          effectiveCapabilities={effectiveCapabilities}
          onToggleRoleTemplate={toggleRoleTemplate}
          onToggleCapability={toggleCapability}
          control={form.control}
        />
      </div>

      <div
        className={
          isDialog
            ? 'mt-4 flex shrink-0 justify-end gap-2 border-t pt-4'
            : 'flex justify-end'
        }
      >
        {isDialog && onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
        <Button type="submit" disabled={create.isPending}>
          {create.isPending ? 'Creating...' : 'Create user'}
        </Button>
      </div>
    </form>
  );
}
