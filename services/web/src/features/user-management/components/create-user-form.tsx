import { startTransition, useEffect, useMemo, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@pulse/ui/button';
import { createDoctorConsultationTariffs } from '@/features/billing/lib/doctor-consultation-tariff';
import { useDepartments } from '@/features/master-data/api';
import { mutationErrorMessage } from '@/lib/mutation-error';
import type { CreateUserBody } from '../types';
import { useCapability } from '@/hooks/use-capability';
import { UM_ROLE_ASSIGN, UM_ROLE_READ } from '@/lib/runtime-capability-keys';
import { useCreateUser } from '../api/mutations';
import { roleCapabilitiesOptions, roleListOptions } from '../api/queries';
import { isDoctorRole, validateDoctorTariffs } from '../lib/is-doctor-role';
import { useTenantStore } from '@/stores/tenant.store';
import { CreateUserTenantField } from './create-user-tenant-field';
import {
  buildCreateUserFormSchema,
  CreateUserAccessSection,
  CreateUserIdentitySection,
  CreateUserWorkplaceSection,
  type CreateUserFormValues,
} from './create-user-form-sections';
import {
  CreateUserDoctorOpdSection,
  EMPTY_DOCTOR_TARIFF_ROW,
} from './create-user-doctor-departments';

/** Maps form values to `POST /users` body. Exported for unit tests. */
export function buildCreateUserRequestBody(
  values: CreateUserFormValues,
  assignRoles: boolean,
  allRoleCapabilityIds: string[],
  /** Configurator organization id when super-admin picked org/tenant. */
  configuratorOrgId?: string | null,
  /** Primary department name (doctor: first tariff row). */
  primaryDepartmentName?: string | null,
): CreateUserBody {
  const roleIds = assignRoles ? values.role_template_ids : [];
  let role_template_capability_ids: string[] | undefined;

  if (assignRoles && roleIds.length === 1 && allRoleCapabilityIds.length > 0) {
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
    department:
      primaryDepartmentName !== undefined
        ? primaryDepartmentName
        : values.department === ''
          ? null
          : values.department,
    clearance_tier_required: values.clearance_tier_required,
    capability_ids: [],
    role_template_ids: roleIds,
    ...(role_template_capability_ids !== undefined ? { role_template_capability_ids } : {}),
  };
}

type CreateUserFormProps = {
  /** When false, defer role/capability/department queries (dialog closed / not mounted). Default true. */
  formActive?: boolean;
  /** Platform super-admin: pick target hospital tenant for POST /users. */
  canSelectTargetTenant?: boolean;
  /** Configurator tenant detail: scope UM APIs and POST /users to this tenant. */
  fixedTargetTenantId?: string;
  fixedConfiguratorOrgId?: string | null;
  layout?: 'page' | 'dialog';
  /** When false, stay on the form after create (e.g. create-only admins without user.read). Default true. */
  navigateToProfileOnSuccess?: boolean;
  onCancel?: () => void;
  onCreated?: (user: { id: string; full_name: string }) => void;
};

export function CreateUserForm({
  formActive = true,
  canSelectTargetTenant = false,
  fixedTargetTenantId,
  fixedConfiguratorOrgId,
  layout = 'page',
  navigateToProfileOnSuccess = true,
  onCancel,
  onCreated,
}: CreateUserFormProps) {
  const umRoleRead = useCapability(UM_ROLE_READ);
  const umRoleAssign = useCapability(UM_ROLE_ASSIGN);
  const navigate = useNavigate();
  const create = useCreateUser();
  const activeTenantId = useTenantStore((s) => s.tenantId);
  const fixedTenant = fixedTargetTenantId?.trim() ?? '';
  const [targetTenantId, setTargetTenantId] = useState(fixedTenant || activeTenantId || '');
  const [configuratorOrgId, setConfiguratorOrgId] = useState<string | null>(
    fixedConfiguratorOrgId ?? null,
  );
  const requireRoleTemplate = umRoleAssign;
  /** Non–super-admin: always scope APIs to the signed-in tenant. Super-admin: selected catalog tenant. */
  const effectiveTenantId = fixedTenant
    ? fixedTenant
    : canSelectTargetTenant
      ? targetTenantId || activeTenantId || ''
      : activeTenantId ?? '';
  const apiTenantScope = fixedTenant
    ? fixedTenant
    : canSelectTargetTenant && targetTenantId
      ? targetTenantId
      : activeTenantId ?? undefined;

  useEffect(() => {
    if (!canSelectTargetTenant && activeTenantId) {
      setTargetTenantId(activeTenantId);
    }
  }, [activeTenantId, canSelectTargetTenant]);

  useEffect(() => {
    if (canSelectTargetTenant && activeTenantId && !targetTenantId) {
      setTargetTenantId(activeTenantId);
    }
  }, [canSelectTargetTenant, activeTenantId, targetTenantId]);
  const formSchema = useMemo(
    () => buildCreateUserFormSchema({ requireRoleTemplate }),
    [requireRoleTemplate],
  );

  const rolesQuery = useQuery({
    ...roleListOptions(apiTenantScope),
    enabled: formActive && umRoleRead && Boolean(effectiveTenantId),
  });

  const form = useForm<CreateUserFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      full_name: '',
      email: '',
      password: '',
      phone: '',
      username: '',
      department: '',
      doctor_tariffs: [],
      clearance_tier_required: 0,
      role_template_ids: [],
      role_capability_selection_ids: [],
    },
  });

  const availableRoles = (rolesQuery.data ?? []).filter((role) => role.status === 'active');

  useEffect(() => {
    if (!requireRoleTemplate) {
      return;
    }
    if (!umRoleRead) {
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
  }, [requireRoleTemplate, umRoleRead, rolesQuery.data, form]);

  const selectedRoleTemplateIds = useWatch({
    control: form.control,
    name: 'role_template_ids',
    defaultValue: [],
  });
  const selectedRoleId = (selectedRoleTemplateIds ?? [])[0] ?? '';
  const isDoctor = isDoctorRole(selectedRoleId, availableRoles);

  const departmentsQuery = useDepartments(undefined, {
    iqTenantId: apiTenantScope,
    formCatalog: true,
    enabled: formActive && isDoctor,
  });
  const activeDepartments = useMemo(
    () => (departmentsQuery.data?.data ?? []).filter((d) => d.is_active),
    [departmentsQuery.data],
  );

  useEffect(() => {
    if (isDoctor && form.getValues('doctor_tariffs').length === 0) {
      form.setValue('doctor_tariffs', [{ ...EMPTY_DOCTOR_TARIFF_ROW }], { shouldDirty: false });
    }
  }, [isDoctor, form]);

  const roleCapabilitiesQueryEnabled = Boolean(selectedRoleId) && umRoleRead;

  const roleCapabilitiesQuery = useQuery({
    ...roleCapabilitiesOptions(selectedRoleId, apiTenantScope),
    enabled: formActive && roleCapabilitiesQueryEnabled,
  });

  const prevRoleIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!canSelectTargetTenant) {
      return;
    }
    form.setValue('role_template_ids', [], { shouldValidate: true });
    form.setValue('role_capability_selection_ids', [], { shouldValidate: true });
    prevRoleIdRef.current = undefined;
  }, [targetTenantId, canSelectTargetTenant, form]);

  const roleTemplatesPending =
    umRoleRead && rolesQuery.isFetching && rolesQuery.data === undefined;
  const roleCapabilitiesPending =
    roleCapabilitiesQueryEnabled &&
    roleCapabilitiesQuery.isFetching &&
    roleCapabilitiesQuery.data === undefined;

  const roleCapabilities = roleCapabilitiesQuery.data ?? [];
  const allRoleCapabilityIds = useMemo(
    () => roleCapabilities.map((capability) => capability.id),
    [roleCapabilities],
  );

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
      const capIds = caps.map((c) => c.id);
      startTransition(() => {
        form.setValue('role_capability_selection_ids', capIds, {
          shouldDirty: true,
          shouldValidate: true,
        });
        if (!isDoctorRole(selectedRoleId, availableRoles)) {
          form.setValue('doctor_tariffs', [], { shouldDirty: true });
        }
      });
    }
  }, [selectedRoleId, roleCapabilitiesQuery.data, availableRoles, form]);

  const roleAssignmentBlocked =
    requireRoleTemplate &&
    (!umRoleRead || (rolesQuery.data !== undefined && availableRoles.length === 0));
  const roleCapabilitiesStillLoading =
    requireRoleTemplate &&
    Boolean(selectedRoleId) &&
    roleCapabilitiesQueryEnabled &&
    (roleCapabilitiesQuery.isFetching || roleCapabilitiesQuery.data === undefined);

  const onSubmit = form.handleSubmit((values) => {
    if (
      umRoleAssign &&
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
    const doctorRole = isDoctorRole(values.role_template_ids[0], availableRoles);
    if (doctorRole) {
      const tariffError = validateDoctorTariffs(values.doctor_tariffs);
      if (tariffError) {
        form.setError('doctor_tariffs', { type: 'custom', message: tariffError });
        return;
      }
    }
    const tenantForCreate = fixedTenant
      ? fixedTenant
      : canSelectTargetTenant && targetTenantId.trim()
        ? targetTenantId.trim()
        : undefined;
    const orgForCreate =
      fixedConfiguratorOrgId ?? (canSelectTargetTenant ? configuratorOrgId : null);
    const primaryDeptName = doctorRole
      ? (activeDepartments.find((d) => d.id === values.doctor_tariffs[0]?.department_id)?.name ??
        null)
      : undefined;
    create.mutate(
      {
        body: buildCreateUserRequestBody(
          values,
          umRoleAssign,
          allRoleCapabilityIds,
          orgForCreate,
          primaryDeptName,
        ),
        targetTenantId: tenantForCreate,
      },
      {
        onSuccess: async (user) => {
          if (doctorRole && values.doctor_tariffs.length > 0) {
            try {
              await createDoctorConsultationTariffs(
                user.id,
                values.full_name,
                values.doctor_tariffs,
                activeDepartments,
                tenantForCreate,
              );
            } catch (err) {
              toast.error(`User created but consultation tariffs failed: ${mutationErrorMessage(err)}`);
            }
          }
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
      },
    );
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

        {canSelectTargetTenant ? (
          <CreateUserTenantField
            tenantId={targetTenantId}
            onTenantChange={setTargetTenantId}
            onOrganizationChange={setConfiguratorOrgId}
          />
        ) : null}

        <CreateUserAccessSection
          roleTemplates={availableRoles}
          roleTemplatesPending={roleTemplatesPending}
          roleTemplatesError={rolesQuery.isError}
          roleCapabilities={roleCapabilities}
          roleCapabilitiesPending={roleCapabilitiesPending}
          roleCapabilitiesError={roleCapabilitiesQuery.isError}
          control={form.control}
          errors={form.formState.errors}
        />

        <CreateUserWorkplaceSection
          register={form.register}
          errors={form.formState.errors}
          control={form.control}
        />

        {isDoctor ? (
          <CreateUserDoctorOpdSection
            control={form.control}
            errors={form.formState.errors}
            iqTenantId={apiTenantScope}
          />
        ) : null}
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
