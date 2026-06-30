import { startTransition, useEffect, useMemo, useRef, useState } from 'react';
import {
  useForm,
  useWatch,
  type UseFormGetValues,
  type UseFormSetValue,
  type UseFormSetError,
} from 'react-hook-form';
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
import type { Capability, UmRole } from '../types';
import type { Department } from '@/features/master-data/types';
import { useTenantStore } from '@/stores/tenant.store';
import { CreateUserTenantField } from './create-user-tenant-field';
import {
  buildCreateUserFormSchema,
  CreateUserAccessSection,
  CreateUserIdentitySection,
  CreateUserWorkplaceSection,
  type CreateUserFormValues,
  type CreateUserFormInput,
} from './create-user-form-sections';
import {
  CreateUserDoctorOpdSection,
  EMPTY_DOCTOR_TARIFF_ROW,
} from './create-user-doctor-departments';

const EMPTY_ROLE_CAPABILITIES: Capability[] = [];

/** Search params for user profile after create when scoped to a hospital tenant. */
export function buildUserProfileNavigateSearch(
  tenantScope?: string | null,
): { tenant: string | undefined } {
  const trimmed = tenantScope?.trim();
  return { tenant: trimmed && trimmed.length > 0 ? trimmed : undefined };
}

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
    // Username-primary login handle; lowercased to match the wire contract (^[a-z0-9._]+$).
    username: values.username.trim().toLowerCase(),
    email: values.email.trim() === '' ? null : values.email.trim(),
    password: values.password,
    phone: values.phone === '' ? null : values.phone,
    // Organization scope (configurator organizations.id) when a super-admin picked an org/tenant;
    // sourced from the configuratorOrgId arg (orgForCreate at the call site), not the form values
    // (the form has no org_id field). Empty/absent -> null.
    org_id: configuratorOrgId || null,
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

/** Scope APIs to: the fixed configurator tenant, the super-admin's pick, else the signed-in tenant. */
function resolveEffectiveTenantId(
  fixedTenant: string,
  canSelectTargetTenant: boolean,
  targetTenantId: string,
  activeTenantId: string | null,
): string {
  if (fixedTenant) {
    return fixedTenant;
  }
  if (canSelectTargetTenant) {
    return targetTenantId || activeTenantId || '';
  }
  return activeTenantId ?? '';
}

/** Tenant header for UM API reads; undefined falls back to the signed-in tenant on the server. */
function resolveApiTenantScope(
  fixedTenant: string,
  canSelectTargetTenant: boolean,
  targetTenantId: string,
  activeTenantId: string | null,
): string | undefined {
  if (fixedTenant) {
    return fixedTenant;
  }
  if (canSelectTargetTenant && targetTenantId) {
    return targetTenantId;
  }
  return activeTenantId ?? undefined;
}

/**
 * Sync the capability checkbox selection to the freshly-loaded role catalog. Mirrors the
 * effect body 1:1: clears selection when no role, default-selects all caps on a role change,
 * and clears doctor tariffs when the new role is not a doctor. `prevRoleIdRef` dedupes per role.
 */
function syncRoleCapabilitySelection(
  selectedRoleId: string,
  caps: Capability[] | undefined,
  availableRoles: UmRole[],
  getValues: UseFormGetValues<CreateUserFormInput>,
  setValue: UseFormSetValue<CreateUserFormInput>,
  prevRoleIdRef: { current: string | undefined },
): void {
  if (!selectedRoleId) {
    if ((getValues('role_capability_selection_ids') ?? []).length > 0) {
      setValue('role_capability_selection_ids', [], {
        shouldDirty: true,
        shouldValidate: false,
      });
    }
    prevRoleIdRef.current = undefined;
    return;
  }
  if (!caps?.length) {
    return;
  }
  if (prevRoleIdRef.current === selectedRoleId) {
    return;
  }
  prevRoleIdRef.current = selectedRoleId;
  const capIds = caps.map((c) => c.id);
  startTransition(() => {
    setValue('role_capability_selection_ids', capIds, {
      shouldDirty: true,
      shouldValidate: true,
    });
    if (!isDoctorRole(selectedRoleId, availableRoles)) {
      setValue('doctor_tariffs', [], { shouldDirty: true });
    }
  });
}

type RoleGatingInput = {
  umRoleRead: boolean;
  requireRoleTemplate: boolean;
  selectedRoleId: string;
  roleCapabilitiesQueryEnabled: boolean;
  availableRoles: UmRole[];
  rolesFetching: boolean;
  rolesLoaded: boolean;
  roleCapabilitiesFetching: boolean;
  roleCapabilitiesLoaded: boolean;
};

type RoleGating = {
  roleTemplatesPending: boolean;
  roleCapabilitiesPending: boolean;
  roleAssignmentBlocked: boolean;
  roleCapabilitiesStillLoading: boolean;
};

/** Derive the role-template / capability loading + blocking flags that gate the submit button. */
function deriveRoleGating(input: RoleGatingInput): RoleGating {
  const roleTemplatesPending = input.umRoleRead && input.rolesFetching && !input.rolesLoaded;
  const roleCapabilitiesPending =
    input.roleCapabilitiesQueryEnabled &&
    input.roleCapabilitiesFetching &&
    !input.roleCapabilitiesLoaded;
  const roleAssignmentBlocked =
    input.requireRoleTemplate &&
    (!input.umRoleRead || (input.rolesLoaded && input.availableRoles.length === 0));
  const roleCapabilitiesStillLoading =
    input.requireRoleTemplate &&
    Boolean(input.selectedRoleId) &&
    input.roleCapabilitiesQueryEnabled &&
    (input.roleCapabilitiesFetching || !input.roleCapabilitiesLoaded);
  return {
    roleTemplatesPending,
    roleCapabilitiesPending,
    roleAssignmentBlocked,
    roleCapabilitiesStillLoading,
  };
}

/** Whether the submit button should be disabled given mutation + role-gating state. */
function isSubmitDisabled(
  createPending: boolean,
  requireRoleTemplate: boolean,
  gating: RoleGating,
): boolean {
  return (
    createPending ||
    gating.roleAssignmentBlocked ||
    gating.roleCapabilitiesStillLoading ||
    (requireRoleTemplate && gating.roleTemplatesPending) ||
    gating.roleCapabilitiesPending
  );
}

/**
 * Pre-submit validation guards. Sets form errors and returns true when submission
 * must be blocked (capability selection missing, or invalid doctor tariffs).
 */
function validateCreateUserSubmit(
  values: CreateUserFormValues,
  setError: UseFormSetError<CreateUserFormValues>,
  umRoleAssign: boolean,
  allRoleCapabilityIds: string[],
  availableRoles: UmRole[],
): boolean {
  if (
    umRoleAssign &&
    values.role_template_ids.length === 1 &&
    allRoleCapabilityIds.length > 0 &&
    values.role_capability_selection_ids.length === 0
  ) {
    setError('role_capability_selection_ids', {
      type: 'custom',
      message: 'Select at least one capability from the role.',
    });
    return true;
  }
  if (isDoctorRole(values.role_template_ids[0], availableRoles)) {
    const tariffError = validateDoctorTariffs(values.doctor_tariffs);
    if (tariffError) {
      setError('doctor_tariffs', { type: 'custom', message: tariffError });
      return true;
    }
  }
  return false;
}

/** Target tenant for POST /users: fixed scope, super-admin selection, or undefined (signed-in tenant). */
function resolveTenantForCreate(
  fixedTenant: string,
  canSelectTargetTenant: boolean,
  targetTenantId: string,
): string | undefined {
  if (fixedTenant) {
    return fixedTenant;
  }
  if (canSelectTargetTenant && targetTenantId.trim()) {
    return targetTenantId.trim();
  }
  return undefined;
}

/** Primary department name for a doctor (first tariff row); undefined for non-doctors. */
function resolvePrimaryDepartmentName(
  doctorRole: boolean,
  values: CreateUserFormValues,
  activeDepartments: Department[],
): string | null | undefined {
  if (!doctorRole) {
    return undefined;
  }
  return (
    activeDepartments.find((d) => d.id === values.doctor_tariffs[0]?.department_id)?.name ?? null
  );
}

/**
 * Create the doctor consultation tariffs after the user exists. Non-doctor or no rows = no-op.
 * Failures here are surfaced as a toast and swallowed (the user was still created).
 */
async function createDoctorTariffsAfterUser(
  user: { id: string; full_name: string },
  values: CreateUserFormValues,
  doctorRole: boolean,
  activeDepartments: Department[],
  tenantForCreate: string | undefined,
): Promise<void> {
  if (!doctorRole || values.doctor_tariffs.length === 0) {
    return;
  }
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
  const effectiveTenantId = resolveEffectiveTenantId(
    fixedTenant,
    canSelectTargetTenant,
    targetTenantId,
    activeTenantId,
  );
  const apiTenantScope = resolveApiTenantScope(
    fixedTenant,
    canSelectTargetTenant,
    targetTenantId,
    activeTenantId,
  );

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

  const form = useForm<CreateUserFormInput, unknown, CreateUserFormValues>({
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

  const availableRoles = useMemo(
    () => (rolesQuery.data ?? []).filter((role) => role.status === 'active'),
    [rolesQuery.data],
  );

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
    if (isDoctor && (form.getValues('doctor_tariffs') ?? []).length === 0) {
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
    form.setValue('role_template_ids', [], { shouldValidate: false });
    form.setValue('role_capability_selection_ids', [], { shouldValidate: false });
    prevRoleIdRef.current = undefined;
  }, [targetTenantId, canSelectTargetTenant, form]);

  const roleCapabilities = roleCapabilitiesQuery.data ?? EMPTY_ROLE_CAPABILITIES;
  const allRoleCapabilityIds = useMemo(
    () => roleCapabilities.map((capability) => capability.id),
    [roleCapabilities],
  );

  useEffect(() => {
    syncRoleCapabilitySelection(
      selectedRoleId,
      roleCapabilitiesQuery.data,
      availableRoles,
      form.getValues,
      form.setValue,
      prevRoleIdRef,
    );
  }, [selectedRoleId, roleCapabilitiesQuery.data, availableRoles, form]);

  const { roleTemplatesPending, roleCapabilitiesPending, roleAssignmentBlocked, roleCapabilitiesStillLoading } =
    deriveRoleGating({
      umRoleRead,
      requireRoleTemplate,
      selectedRoleId,
      roleCapabilitiesQueryEnabled,
      availableRoles,
      rolesFetching: rolesQuery.isFetching,
      rolesLoaded: rolesQuery.data !== undefined,
      roleCapabilitiesFetching: roleCapabilitiesQuery.isFetching,
      roleCapabilitiesLoaded: roleCapabilitiesQuery.data !== undefined,
    });

  const onSubmit = form.handleSubmit((submittedValues) => {
    // react-hook-form types this callback's argument as the zodResolver *output* type, whose
    // optional fields (doctor_tariffs/room_number) make it nominally distinct from
    // CreateUserFormValues even though the data has just passed validation against formSchema.
    // Narrow once to the form's own value type — the runtime shape is guaranteed by validation.
    const values = submittedValues as CreateUserFormValues;
    if (validateCreateUserSubmit(values, form.setError, umRoleAssign, allRoleCapabilityIds, availableRoles)) {
      return;
    }
    const doctorRole = isDoctorRole(values.role_template_ids[0], availableRoles);
    const tenantForCreate = resolveTenantForCreate(
      fixedTenant,
      canSelectTargetTenant,
      targetTenantId,
    );
    const orgForCreate =
      fixedConfiguratorOrgId ?? (canSelectTargetTenant ? configuratorOrgId : null);
    const primaryDeptName = resolvePrimaryDepartmentName(doctorRole, values, activeDepartments);
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
          await createDoctorTariffsAfterUser(
            user,
            values,
            doctorRole,
            activeDepartments,
            tenantForCreate,
          );
          if (navigateToProfileOnSuccess) {
            void navigate({
              to: '/user-management/$userId',
              params: { userId: user.id },
              search: buildUserProfileNavigateSearch(tenantForCreate),
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
          selectedRoleId={selectedRoleId}
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
          disabled={isSubmitDisabled(create.isPending, requireRoleTemplate, {
            roleTemplatesPending,
            roleCapabilitiesPending,
            roleAssignmentBlocked,
            roleCapabilitiesStillLoading,
          })}
        >
          {create.isPending ? 'Creating...' : 'Create user'}
        </Button>
      </div>
    </form>
  );
}
