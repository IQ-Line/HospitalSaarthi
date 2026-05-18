import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@pulse/ui/button';
import type { CreateUserBody } from '../types';
import { useCreateUser } from '../api/mutations';
import { roleCapabilitiesOptions, roleListOptions } from '../api/queries';
import {
  buildCreateUserFormSchema,
  CreateUserAccessSection,
  CreateUserIdentitySection,
  CreateUserOrganizationSection,
  type CreateUserFormValues,
} from './create-user-form-sections';

/** Maps form values to `POST /users` body. Exported for unit tests. */
export function buildCreateUserRequestBody(
  values: CreateUserFormValues,
  canManageAccess: boolean,
  allRoleCapabilityIds: string[],
): CreateUserBody {
  const roleIds = canManageAccess ? values.role_template_ids : [];
  let role_template_capability_ids: string[] | undefined;

  if (canManageAccess && roleIds.length === 1 && allRoleCapabilityIds.length > 0) {
    const picked = values.role_capability_selection_ids.filter((id) =>
      allRoleCapabilityIds.includes(id),
    );
    // Always send explicit capability ids when the UI loaded the role catalog — matches what
    // the admin selected (including default "select all"). Never send [] (backend = grant nothing).
    role_template_capability_ids =
      picked.length > 0 ? picked : [...allRoleCapabilityIds];
  }

  return {
    full_name: values.full_name,
    email: values.email.trim(),
    password: values.password,
    phone: values.phone === '' ? null : values.phone,
    username: values.username === '' ? null : values.username,
    org_id: values.org_id === '' ? null : values.org_id,
    department: values.department === '' ? null : values.department,
    clearance_tier_required: values.clearance_tier_required,
    capability_ids: [],
    role_template_ids: roleIds,
    ...(role_template_capability_ids !== undefined ? { role_template_capability_ids } : {}),
  };
}

type CreateUserFormProps = {
  canReadRoleTemplates: boolean;
  canReadCapabilities: boolean;
  canManageAccess: boolean;
  layout?: 'page' | 'dialog';
  /** When false, stay on the form after create (e.g. create-only admins without user.read). Default true. */
  navigateToProfileOnSuccess?: boolean;
  onCancel?: () => void;
  onCreated?: (user: { id: string; full_name: string }) => void;
};

export function CreateUserForm({
  canReadRoleTemplates,
  canReadCapabilities,
  canManageAccess,
  layout = 'page',
  navigateToProfileOnSuccess = true,
  onCancel,
  onCreated,
}: CreateUserFormProps) {
  const navigate = useNavigate();
  const create = useCreateUser();
  const requireRoleTemplate = canManageAccess;
  const formSchema = useMemo(
    () => buildCreateUserFormSchema({ requireRoleTemplate }),
    [requireRoleTemplate],
  );

  const rolesQuery = useQuery({
    ...roleListOptions(),
    enabled: canReadRoleTemplates,
    staleTime: 30_000,
  });

  const form = useForm<CreateUserFormValues>({
    resolver: zodResolver(formSchema),
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
      role_capability_selection_ids: [],
    },
  });

  const availableRoles = (rolesQuery.data ?? []).filter((role) => role.status === 'active');

  useLayoutEffect(() => {
    if (!requireRoleTemplate) {
      return;
    }
    if (!canReadRoleTemplates) {
      return;
    }
    const roles = (rolesQuery.data ?? []).filter((role) => role.status === 'active');
    if (roles.length === 0) {
      return;
    }
    const current = form.getValues('role_template_ids');
    if (current.length !== 1) {
      form.setValue('role_template_ids', [roles[0].id], { shouldValidate: true });
    }
  }, [requireRoleTemplate, canReadRoleTemplates, rolesQuery.data, form]);

  const selectedRoleTemplateIds = form.watch('role_template_ids');
  const selectedRoleId = selectedRoleTemplateIds[0] ?? '';

  const roleCapabilitiesQueryEnabled =
    Boolean(selectedRoleId) && canReadRoleTemplates && canReadCapabilities;

  const roleCapabilitiesQuery = useQuery({
    ...roleCapabilitiesOptions(selectedRoleId),
    enabled: roleCapabilitiesQueryEnabled,
    staleTime: 30_000,
  });

  const roleTemplatesPending =
    canReadRoleTemplates && rolesQuery.isFetching && rolesQuery.data === undefined;
  const roleCapabilitiesPending =
    roleCapabilitiesQueryEnabled &&
    roleCapabilitiesQuery.isFetching &&
    roleCapabilitiesQuery.data === undefined;

  const roleCapabilities = roleCapabilitiesQuery.data ?? [];
  const allRoleCapabilityIds = useMemo(
    () => roleCapabilities.map((capability) => capability.id),
    [roleCapabilities],
  );

  const prevRoleIdRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!selectedRoleId) {
      form.setValue('role_capability_selection_ids', [], {
        shouldDirty: true,
        shouldValidate: true,
      });
      prevRoleIdRef.current = undefined;
      return;
    }
    const caps = roleCapabilitiesQuery.data;
    if (!caps?.length) {
      return;
    }
    if (prevRoleIdRef.current !== selectedRoleId) {
      prevRoleIdRef.current = selectedRoleId;
      form.setValue(
        'role_capability_selection_ids',
        caps.map((c) => c.id),
        { shouldDirty: true, shouldValidate: true },
      );
    }
  }, [selectedRoleId, roleCapabilitiesQuery.data, form]);

  const roleAssignmentBlocked =
    requireRoleTemplate &&
    (!canReadRoleTemplates || (rolesQuery.data !== undefined && availableRoles.length === 0));
  const roleCapabilitiesStillLoading =
    requireRoleTemplate &&
    Boolean(selectedRoleId) &&
    roleCapabilitiesQueryEnabled &&
    (roleCapabilitiesQuery.isFetching || roleCapabilitiesQuery.data === undefined);

  const onSubmit = form.handleSubmit((values) => {
    if (
      canManageAccess &&
      values.role_template_ids.length === 1 &&
      allRoleCapabilityIds.length > 0 &&
      values.role_capability_selection_ids.length === 0
    ) {
      form.setError('role_capability_selection_ids', {
        type: 'custom',
        message: 'Select at least one capability from the role.',
      });
      return;
    }
    create.mutate(buildCreateUserRequestBody(values, canManageAccess, allRoleCapabilityIds), {
      onSuccess: (user) => {
        if (navigateToProfileOnSuccess) {
          void navigate({
            to: '/user-management/$userId',
            params: { userId: user.id },
          });
          return;
        }
        form.reset();
        onCreated?.(user);
      },
    });
  });

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
        <CreateUserIdentitySection register={form.register} errors={form.formState.errors} />

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
          roleTemplatesPending={roleTemplatesPending}
          roleTemplatesError={rolesQuery.isError}
          roleCapabilities={roleCapabilities}
          roleCapabilitiesPending={roleCapabilitiesPending}
          roleCapabilitiesError={roleCapabilitiesQuery.isError}
          control={form.control}
          errors={form.formState.errors}
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
        <Button
          type="submit"
          disabled={
            create.isPending ||
            roleAssignmentBlocked ||
            roleCapabilitiesStillLoading ||
            (requireRoleTemplate && roleTemplatesPending) ||
            roleCapabilitiesPending
          }
        >
          {create.isPending ? 'Creating...' : 'Create user'}
        </Button>
      </div>
    </form>
  );
}
