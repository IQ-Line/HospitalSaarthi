import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller, type UseFormReturn } from 'react-hook-form';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@pulse/ui/badge';
import { Button } from '@pulse/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { DataTable } from '@/components/data-table';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { EntityFormDialog } from '@/components/entity-table/entity-form-dialog';
import { EntityRowActions } from '@/components/entity-table/entity-row-actions';
import { EntityTableToolbar } from '@/components/entity-table/entity-table-toolbar';
import { TableActiveToggle } from '@/components/entity-table/table-active-toggle';
import { configuratorKeys, useTenantUsers } from '@/features/configurator/api';
import { CapabilityGate } from '@/components/capability-gate';
import { useCapability, useAnyCapability } from '@/hooks/use-capability';
import {
  UM_CAPABILITY_READ,
  UM_ROLE_CREATE,
  UM_ROLE_READ,
  UM_ROLE_UPDATE,
  UM_ROLES_ADMIN_ANY,
  UM_USER_CREATE,
  UM_USER_READ,
} from '@/lib/runtime-capability-keys';
import { CreateUserForm } from '@/features/user-management/components/create-user-form';
import { UserProfileNameLink } from '@/features/user-management/components/user-list-table';
import type { Capability, UmUser } from '@/features/user-management/types';
import {
  useCreateTariffService,
  useTariffServices,
  useUpdateTariffService,
} from '@/features/billing/api';
import {
  TariffServiceCreateFormFields,
  TariffServiceEditFormFields,
} from '@/features/billing/components/tariff-service-form-fields';
import { formatMoneyDisplay } from '@/features/billing/lib/format';
import {
  formToCreatePayload,
  formToUpdatePayload,
  serviceToEditFormValues,
} from '@/features/billing/lib/form-mappers';
import type { TariffService } from '@/features/billing/types';
import { useCatalogModuleCrud } from '@/hooks/use-catalog-module-crud';
import {
  EMPTY_TARIFF_CREATE_VALUES,
  EMPTY_TARIFF_EDIT_VALUES,
  tariffServiceCreateSchema,
  tariffServiceEditSchema,
  type TariffServiceCreateFormValues,
  type TariffServiceEditFormValues,
} from '@/features/billing/validation';
import {
  useCreateDepartment,
  useDeleteDepartment,
  useDepartments,
  useUpdateDepartment,
  DEPARTMENT_CATALOG_DEFAULT_PAGE_SIZE,
  DEPARTMENT_CATALOG_PAGE_SIZES,
} from '@/features/master-data/api';
import { ReadOnlyRow } from '@/features/master-data/components/read-only-row';
import { mutationErrorMessage } from '@/features/master-data/mutation-error';
import { rowMatchesSearch } from '@/features/master-data/table-search';
import type { Department, DepartmentType } from '@/features/master-data/types';
import { toSlug } from '@/features/master-data/utils';
import {
  EMPTY_DEPARTMENT_FORM_VALUES,
  departmentFormSchema,
  type DepartmentFormInput,
  type DepartmentFormValues,
} from '@/features/master-data/validation';
import { useCreateRole, useDeleteRole, useUpdateRole } from '@/features/user-management/api/mutations';
import {
  assignableCapabilityCatalogOptions,
  roleListOptions,
  useRoleCapabilities,
} from '@/features/user-management/api/queries';
import { userManagementKeys } from '@/features/user-management/api/keys';
import type { UmRole } from '@/features/user-management/types';
import {
  suggestUniqueRoleCode,
  toRoleCodeSlug,
} from '@/features/user-management/lib/suggest-unique-role-code';
import {
  RoleEditorDialog,
  RoleListSection,
} from '@/features/user-management/components/role-management-sections';
import { apiClient, ApiError } from '@/lib/api-client';
import { mutationErrorMessage as billingMutationError } from '@/lib/mutation-error';

const DEPARTMENT_TYPES: DepartmentType[] = [
  'clinical',
  'diagnostic',
  'administrative',
  'support',
];

const DEPARTMENT_TYPE_LABELS: Record<DepartmentType, string> = {
  clinical: 'Clinical',
  diagnostic: 'Diagnostic',
  administrative: 'Administrative',
  support: 'Support',
};


export function TenantUsersPanel({
  iqTenantId,
  organizationId,
}: {
  iqTenantId: string;
  organizationId: string;
}) {
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const umUserRead = useCapability(UM_USER_READ);
  const { data, isLoading, error } = useTenantUsers(iqTenantId);

  const openUserProfile = useCallback(
    (user: UmUser) => {
      if (!umUserRead) return;
      void navigate({
        to: '/user-management/$userId',
        params: { userId: user.id },
        search: { tenant: iqTenantId },
      });
    },
    [iqTenantId, navigate, umUserRead],
  );

  const columns = useMemo<ColumnDef<UmUser, unknown>[]>(
    () => [
      {
        accessorKey: 'full_name',
        header: 'Name',
        cell: ({ row }) => (
          <UserProfileNameLink
            userId={row.original.id}
            fullName={row.original.full_name}
            tenantScope={iqTenantId}
            linkToProfile={umUserRead}
          />
        ),
      },
      {
        accessorKey: 'email',
        header: 'Email',
        cell: ({ getValue }) => getValue<string | null>() ?? '—',
      },
      {
        accessorKey: 'username',
        header: 'Username',
        cell: ({ getValue }) => getValue<string | null>() ?? '—',
      },
      {
        accessorKey: 'department',
        header: 'Department',
        cell: ({ getValue }) => getValue<string | null>() ?? '—',
      },
      {
        accessorKey: 'role_display_names',
        header: 'Roles',
        cell: ({ getValue }) => {
          const names = getValue<string[] | undefined>();
          if (!names || names.length === 0) return <span className="text-muted-foreground">—</span>;
          return (
            <div className="flex flex-wrap gap-1">
              {names.map((name) => (
                <Badge key={name} variant="outline" className="text-xs">
                  {name}
                </Badge>
              ))}
            </div>
          );
        },
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ getValue }) => (
          <Badge variant={getValue<string>() === 'active' ? 'default' : 'secondary'}>
            {getValue<string>()}
          </Badge>
        ),
      },
    ],
    [iqTenantId, umUserRead],
  );

  const rows = useMemo(() => {
    const list = data ?? [];
    if (!search.trim()) return list;
    return list.filter((u) =>
      rowMatchesSearch(search, u.full_name, u.email ?? '', u.username ?? '', u.department ?? ''),
    );
  }, [data, search]);

  if (error) {
    return <p className="text-sm text-destructive">Failed to load users: {error.message}</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <EntityTableToolbar value={search} onChange={setSearch} placeholder="Search users…" />
        <CapabilityGate capability={UM_USER_CREATE}>
          <Button
            type="button"
            className="shrink-0 bg-[#008C9E] text-white hover:bg-[#00798a]"
            onClick={() => setCreateOpen(true)}
          >
            Add user
          </Button>
        </CapabilityGate>
      </div>
      <div className="rounded-lg border">
        <DataTable
          columns={columns}
          data={rows}
          isLoading={isLoading}
          emptyTitle="No users"
          emptyDescription="No directory users for this tenant yet."
          onRowClick={umUserRead ? openUserProfile : undefined}
        />
      </div>
      <CapabilityGate capability={UM_USER_CREATE}>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="flex max-h-[min(88dvh,960px)] w-full max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-6xl">
            <div className="shrink-0 border-b p-4 pb-3">
              <DialogHeader>
                <DialogTitle>Add user</DialogTitle>
                <DialogDescription>
                  Create a user in this tenant. They will be able to sign in after you share their
                  credentials.
                </DialogDescription>
              </DialogHeader>
            </div>
            <div className="flex min-h-0 flex-1 overflow-hidden p-4">
              {createOpen ? (
                <CreateUserForm
                  fixedTargetTenantId={iqTenantId}
                  fixedConfiguratorOrgId={organizationId}
                  layout="dialog"
                  navigateToProfileOnSuccess={false}
                  onCancel={() => setCreateOpen(false)}
                  onCreated={(user) => {
                    void qc.invalidateQueries({
                      queryKey: configuratorKeys.tenantUsers(iqTenantId),
                    });
                    toast.success(`User ${user.full_name} created`);
                    setCreateOpen(false);
                  }}
                />
              ) : null}
            </div>
          </DialogContent>
        </Dialog>
      </CapabilityGate>
    </div>
  );
}

function DepartmentFormFields({
  form,
}: {
  form: UseFormReturn<DepartmentFormInput, unknown, DepartmentFormValues>;
}) {
  const {
    register,
    control,
    watch,
    formState: { errors },
  } = form;
  const watchedName = watch('name');
  const codeSuggestion = toSlug(watchedName).toUpperCase().replace(/-/g, '_');

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="dept-name">Name</Label>
          <Input
            id="dept-name"
            placeholder="e.g. Cardiology"
            {...register('name')}
          />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dept-code">Code</Label>
          <Input
            id="dept-code"
            placeholder={codeSuggestion || 'e.g. CARDIOLOGY'}
            {...register('code')}
          />
          {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Type</Label>
        <Controller
          name="type"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select department type" />
              </SelectTrigger>
              <SelectContent>
                {DEPARTMENT_TYPES.map((option) => (
                  <SelectItem key={option} value={option}>
                    {DEPARTMENT_TYPE_LABELS[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.type && <p className="text-xs text-destructive">{errors.type.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="dept-description">Description (optional)</Label>
        <Textarea
          id="dept-description"
          rows={3}
          placeholder={`Describe the ${watchedName || 'department'} and its scope`}
          {...register('description')}
        />
        {errors.description && (
          <p className="text-xs text-destructive">{errors.description.message}</p>
        )}
      </div>

      <div className="flex items-center justify-between rounded-md border px-3 py-2">
        <div>
          <p className="text-sm font-medium">Active</p>
          <p className="text-xs text-muted-foreground">
            Inactive departments are hidden from selection lists.
          </p>
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
  );
}

export function TenantDepartmentsPanel({ iqTenantId }: { iqTenantId: string }) {
  const { canCreate, canUpdate, canDelete } = useCatalogModuleCrud('departments', {
    productModuleSlug: 'master-data',
  });
  const [tableSearch, setTableSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<DepartmentType | 'all'>('all');
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(DEPARTMENT_CATALOG_DEFAULT_PAGE_SIZE);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [viewingDepartment, setViewingDepartment] = useState<Department | null>(null);
  const [deletingDepartment, setDeletingDepartment] = useState<Department | null>(null);

  const deptType = typeFilter === 'all' ? undefined : typeFilter;
  const listPage = useMemo(() => ({ pageIndex, pageSize }), [pageIndex, pageSize]);
  useEffect(() => {
    setPageIndex(0);
  }, [tableSearch, typeFilter]);
  const { data, isLoading, error } = useDepartments(deptType, {
    iqTenantId,
    search: tableSearch || undefined,
    page: listPage,
  });
  const departments = data?.data ?? [];
  const total = data?.total ?? 0;

  const createMutation = useCreateDepartment(iqTenantId);
  const updateMutation = useUpdateDepartment(iqTenantId);
  const deleteMutation = useDeleteDepartment(iqTenantId);

  const createForm = useForm<DepartmentFormInput, unknown, DepartmentFormValues>({
    resolver: zodResolver(departmentFormSchema),
    defaultValues: EMPTY_DEPARTMENT_FORM_VALUES,
  });
  const editForm = useForm<DepartmentFormInput, unknown, DepartmentFormValues>({
    resolver: zodResolver(departmentFormSchema),
    defaultValues: EMPTY_DEPARTMENT_FORM_VALUES,
  });

  const columns = useMemo<ColumnDef<Department, unknown>[]>(
    () => [
      { accessorKey: 'name', header: 'Name' },
      {
        accessorKey: 'code',
        header: 'Code',
        cell: ({ getValue }) => <code className="text-xs">{getValue<string>()}</code>,
      },
      {
        accessorKey: 'type',
        header: 'Type',
        cell: ({ getValue }) => (
          <Badge variant="secondary">
            {DEPARTMENT_TYPE_LABELS[getValue<DepartmentType>()] ?? getValue<string>()}
          </Badge>
        ),
      },
      {
        accessorKey: 'is_active',
        header: 'Status',
        cell: ({ row }) => (
          <TableActiveToggle
            active={row.original.is_active}
            disabled={
              !canUpdate ||
              (updateMutation.isPending &&
                updateMutation.variables?.id === row.original.id)
            }
            onCheckedChange={(next) => {
              if (next === row.original.is_active) return;
              updateMutation.mutate(
                { id: row.original.id, input: { is_active: next } },
                {
                  onSuccess: () =>
                    toast.success(
                      next ? 'Department activated' : 'Department deactivated',
                    ),
                  onError: (err) => toast.error(mutationErrorMessage(err)),
                },
              );
            }}
          />
        ),
      },
      {
        id: 'actions',
        header: () => <div className="text-right">Actions</div>,
        cell: ({ row }) => (
          <EntityRowActions
            onView={() => setViewingDepartment(row.original)}
            onEdit={() => {
              setEditingDepartment(row.original);
              editForm.reset({
                name: row.original.name,
                code: row.original.code,
                type: row.original.type,
                description: row.original.description,
                is_active: row.original.is_active,
              });
            }}
            onDelete={() => setDeletingDepartment(row.original)}
            disabled={deleteMutation.isPending}
            canEdit={canUpdate}
            canDelete={canDelete}
          />
        ),
      },
    ],
    [
      canDelete,
      canUpdate,
      deleteMutation.isPending,
      editForm,
      updateMutation.isPending,
      updateMutation.variables,
    ],
  );

  const onCreateSubmit = createForm.handleSubmit(async (values) => {
    try {
      await createMutation.mutateAsync(values);
      toast.success('Department created');
      setIsCreateOpen(false);
      createForm.reset(EMPTY_DEPARTMENT_FORM_VALUES);
    } catch (err) {
      toast.error(mutationErrorMessage(err));
    }
  });

  const onEditSubmit = editForm.handleSubmit(async (values) => {
    if (!editingDepartment) return;
    try {
      await updateMutation.mutateAsync({
        id: editingDepartment.id,
        input: values,
      });
      toast.success('Department updated');
      setEditingDepartment(null);
    } catch (err) {
      toast.error(mutationErrorMessage(err));
    }
  });

  const onDeleteConfirm = async () => {
    if (!deletingDepartment) return;
    try {
      await deleteMutation.mutateAsync(deletingDepartment.id);
      toast.success('Department deleted');
      setDeletingDepartment(null);
    } catch (err) {
      toast.error(mutationErrorMessage(err));
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Select
          value={typeFilter}
          onValueChange={(value) => setTypeFilter(value as DepartmentType | 'all')}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Filter type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {DEPARTMENT_TYPES.map((option) => (
              <SelectItem key={option} value={option}>
                {DEPARTMENT_TYPE_LABELS[option]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {canCreate ? (
          <Button
            size="sm"
            onClick={() => {
              createForm.reset(EMPTY_DEPARTMENT_FORM_VALUES);
              setIsCreateOpen(true);
            }}
          >
            <Plus className="size-4 mr-1" />
            Add Department
          </Button>
        ) : null}
      </div>
      <EntityTableToolbar value={tableSearch} onChange={setTableSearch} placeholder="Search name, code, type…" />
      <div className="rounded-lg border">
        {error ? (
          <p className="p-3 text-sm text-destructive">Failed to load departments: {error.message}</p>
        ) : (
          <DataTable
            columns={columns}
            data={departments}
            isLoading={isLoading}
            emptyTitle="No departments found"
            emptyDescription="Add a department to get started."
            manualPagination={{
              pageIndex,
              pageSize,
              total,
              pageSizeOptions: DEPARTMENT_CATALOG_PAGE_SIZES,
              onPageChange: setPageIndex,
              onPageSizeChange: setPageSize,
            }}
          />
        )}
      </div>

      {/* Create dialog */}
      <EntityFormDialog
        open={isCreateOpen}
        onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) createForm.reset(EMPTY_DEPARTMENT_FORM_VALUES);
        }}
        title="Add Department"
        description="Create a new hospital department."
        submitLabel="Create Department"
        isSubmitting={createMutation.isPending}
        onSubmit={onCreateSubmit}
      >
        <DepartmentFormFields form={createForm} />
      </EntityFormDialog>

      {/* Edit dialog */}
      <EntityFormDialog
        open={!!editingDepartment}
        onOpenChange={(open) => {
          if (!open) setEditingDepartment(null);
        }}
        title="Edit Department"
        description="Update department details."
        submitLabel="Save Changes"
        isSubmitting={updateMutation.isPending}
        onSubmit={onEditSubmit}
      >
        <DepartmentFormFields form={editForm} />
      </EntityFormDialog>

      {/* View dialog */}
      <Dialog
        open={!!viewingDepartment}
        onOpenChange={(open) => !open && setViewingDepartment(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Department details</DialogTitle>
            <DialogDescription>Read-only department information.</DialogDescription>
          </DialogHeader>
          {viewingDepartment && (
            <div className="space-y-2 text-sm">
              <ReadOnlyRow label="Name" value={viewingDepartment.name} />
              <ReadOnlyRow label="Code" value={viewingDepartment.code} />
              <ReadOnlyRow
                label="Type"
                value={DEPARTMENT_TYPE_LABELS[viewingDepartment.type] ?? viewingDepartment.type}
              />
              <ReadOnlyRow
                label="Status"
                value={viewingDepartment.is_active ? 'Active' : 'Inactive'}
              />
              <ReadOnlyRow label="Description" value={viewingDepartment.description ?? '-'} />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deletingDepartment}
        onOpenChange={(open) => !open && setDeletingDepartment(null)}
        title="Delete department"
        description={`Soft-delete department "${deletingDepartment?.name ?? ''}"?`}
        confirmLabel="Delete"
        destructive
        onConfirm={onDeleteConfirm}
      />
    </div>
  );
}

type TenantRoleEditorMode = 'create' | 'edit' | 'view' | null;

type TenantRoleState = {
  selectedRoleId: string;
  createCodeManuallyEdited: boolean;
  createRoleForm: { roleType: string; code: string; displayName: string; description: string };
  editRoleForm: { roleType: string; code: string; displayName: string; description: string };
  selectedCapabilityIds: string[];
};

type TenantRoleAction =
  | { type: 'selectRole'; roleId: string }
  | { type: 'updateCreateField'; field: keyof TenantRoleState['createRoleForm']; value: string }
  | { type: 'resetCreateForm' }
  | { type: 'hydrateEditForm'; role: UmRole | null }
  | { type: 'updateEditField'; field: keyof TenantRoleState['editRoleForm']; value: string }
  | { type: 'setSelectedCapabilityIds'; capabilityIds: string[] }
  | { type: 'toggleCapability'; capabilityId: string };

const tenantRoleInitialState: TenantRoleState = {
  selectedRoleId: '',
  createCodeManuallyEdited: false,
  createRoleForm: { roleType: '', code: '', displayName: '', description: '' },
  editRoleForm: { roleType: '', code: '', displayName: '', description: '' },
  selectedCapabilityIds: [],
};

function normalizeRoleDraft(role: {
  roleType: string;
  code: string;
  displayName: string;
  description: string;
}) {
  return {
    code: role.code.trim(),
    role_type: role.roleType.trim(),
    display_name: role.displayName.trim(),
    description: role.description.trim() === '' ? null : role.description.trim(),
  };
}

function normalizeExistingRole(role: UmRole) {
  return {
    code: role.code,
    role_type: role.role_type,
    display_name: role.display_name,
    description: role.description ?? null,
  };
}

function sameCapabilitySet(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false;
  const rightSet = new Set(right);
  return left.every((item) => rightSet.has(item));
}

function tenantRoleReducer(state: TenantRoleState, action: TenantRoleAction): TenantRoleState {
  switch (action.type) {
    case 'selectRole':
      return { ...state, selectedRoleId: action.roleId };
    case 'updateCreateField':
      if (action.field === 'displayName') {
        return {
          ...state,
          createRoleForm: {
            ...state.createRoleForm,
            displayName: action.value,
          },
        };
      }
      if (action.field === 'code') {
        return {
          ...state,
          createCodeManuallyEdited: true,
          createRoleForm: { ...state.createRoleForm, code: action.value },
        };
      }
      return {
        ...state,
        createRoleForm: { ...state.createRoleForm, [action.field]: action.value },
      };
    case 'resetCreateForm':
      return {
        ...state,
        createCodeManuallyEdited: false,
        createRoleForm: tenantRoleInitialState.createRoleForm,
      };
    case 'hydrateEditForm':
      return {
        ...state,
        editRoleForm: action.role
          ? {
              roleType: action.role.role_type,
              code: action.role.code,
              displayName: action.role.display_name,
              description: action.role.description ?? '',
            }
          : tenantRoleInitialState.editRoleForm,
      };
    case 'updateEditField':
      return {
        ...state,
        editRoleForm: { ...state.editRoleForm, [action.field]: action.value },
      };
    case 'setSelectedCapabilityIds':
      return { ...state, selectedCapabilityIds: action.capabilityIds };
    case 'toggleCapability':
      return {
        ...state,
        selectedCapabilityIds: state.selectedCapabilityIds.includes(action.capabilityId)
          ? state.selectedCapabilityIds.filter((id) => id !== action.capabilityId)
          : [...state.selectedCapabilityIds, action.capabilityId],
      };
    default:
      return state;
  }
}

function tenantRoleMutationError(err: unknown): string {
  if (err instanceof ApiError) {
    const body = err.body?.trim();
    if (body) return body.length > 280 ? `${body.slice(0, 280)}...` : body;
    return err.message;
  }
  if (err instanceof Error) return err.message;
  return 'Request failed';
}

const UM_BASE = '/api/user-management';


export function TenantRoleTemplatesPanel({ iqTenantId }: { iqTenantId: string }) {
  const qc = useQueryClient();
  const umRoleRead = useCapability(UM_ROLE_READ);
  const umRoleCreate = useCapability(UM_ROLE_CREATE);
  const umRoleUpdate = useCapability(UM_ROLE_UPDATE);
  const umCapabilityRead = useCapability(UM_CAPABILITY_READ);
  const umRolesAdmin = useAnyCapability(UM_ROLES_ADMIN_ANY);

  const { data: roles = [], isLoading, error } = useQuery(roleListOptions(iqTenantId));
  const [state, dispatch] = useReducer(tenantRoleReducer, tenantRoleInitialState);
  const [editorMode, setEditorMode] = useState<TenantRoleEditorMode>(null);
  const [deleteRoleDialogOpen, setDeleteRoleDialogOpen] = useState(false);
  const [roleSearch, setRoleSearch] = useState('');
  const [capabilitySearch, setCapabilitySearch] = useState('');
  const [dialogSavePending, setDialogSavePending] = useState(false);
  /** Bumps on create reset so Radix Select remounts (avoids stale role type after Reset). */
  const [createFormSession, setCreateFormSession] = useState(0);

  const createRole = useCreateRole(iqTenantId);
  const deleteRole = useDeleteRole(iqTenantId);
  const selectedRole = roles.find((role) => role.id === state.selectedRoleId) ?? null;
  const isViewMode = editorMode === 'view';
  const isEditMode = editorMode === 'edit';
  const isCreateMode = editorMode === 'create';

  const capabilitiesQuery = useQuery({
    ...assignableCapabilityCatalogOptions(iqTenantId, { productOnly: true }),
    enabled: umCapabilityRead && editorMode !== null,
  });
  const roleCapabilitiesQuery = useRoleCapabilities(
    state.selectedRoleId,
    umRoleRead && (isEditMode || isViewMode) && selectedRole !== null,
    iqTenantId,
  );
  const updateRole = useUpdateRole(state.selectedRoleId, iqTenantId);

  const normalizedRoleSearch = roleSearch.trim().toLowerCase();
  const filteredRoles = useMemo(
    () =>
      roles.filter((role) => {
        if (normalizedRoleSearch === '') return true;
        return [role.display_name, role.code, role.description ?? ''].some((v) =>
          v.toLowerCase().includes(normalizedRoleSearch),
        );
      }),
    [roles, normalizedRoleSearch],
  );

  useEffect(() => {
    const [firstRole] = roles;
    if (!selectedRole && firstRole) {
      dispatch({ type: 'selectRole', roleId: firstRole.id });
    }
  }, [roles, selectedRole]);

  useEffect(() => {
    dispatch({ type: 'hydrateEditForm', role: selectedRole });
  }, [selectedRole]);

  useEffect(() => {
    if ((editorMode !== 'edit' && editorMode !== 'view') || !roleCapabilitiesQuery.data) return;
    dispatch({
      type: 'setSelectedCapabilityIds',
      capabilityIds: roleCapabilitiesQuery.data.map((cap: Capability) => cap.id),
    });
  }, [editorMode, roleCapabilitiesQuery.data]);

  const editableCapabilities = umCapabilityRead
    ? (capabilitiesQuery.data ?? [])
    : (roleCapabilitiesQuery.data ?? []);

  const filteredCapabilities = useMemo(() => {
    const search = capabilitySearch.trim().toLowerCase();
    if (search === '') return editableCapabilities;
    return editableCapabilities.filter((cap) =>
      [cap.display_name, cap.capability_key, cap.module, cap.feature, cap.action, cap.description ?? ''].some(
        (v) => v.toLowerCase().includes(search),
      ),
    );
  }, [editableCapabilities, capabilitySearch]);

  const visibleCapabilityIds = useMemo(
    () => filteredCapabilities.map((cap) => cap.id),
    [filteredCapabilities],
  );
  const assignedCapabilityIds = useMemo(
    () => (roleCapabilitiesQuery.data ?? []).map((cap: Capability) => cap.id),
    [roleCapabilitiesQuery.data],
  );

  const editorOpen = editorMode !== null;
  const canModifyActiveEditor =
    isCreateMode ? umRoleCreate : isEditMode ? umRoleUpdate : false;
  const existingRoleCodes = useMemo(() => roles.map((r) => r.code), [roles]);
  const activeForm = isCreateMode ? state.createRoleForm : state.editRoleForm;
  const activeDraft = normalizeRoleDraft(activeForm);
  const createHasDraft =
    state.createRoleForm.roleType !== '' ||
    state.createRoleForm.code !== '' ||
    state.createRoleForm.displayName !== '' ||
    state.createRoleForm.description !== '' ||
    state.selectedCapabilityIds.length > 0;
  const editRoleDraft = normalizeRoleDraft(state.editRoleForm);
  const editRoleDirty =
    selectedRole !== null &&
    JSON.stringify(editRoleDraft) !== JSON.stringify(normalizeExistingRole(selectedRole));
  const capabilitiesDirty =
    selectedRole !== null && !sameCapabilitySet(assignedCapabilityIds, state.selectedCapabilityIds);
  const editorDirty = isCreateMode ? createHasDraft : editRoleDirty || capabilitiesDirty;
  const savePending = dialogSavePending || createRole.isPending || updateRole.isPending;
  const saveEnabled =
    canModifyActiveEditor &&
    activeDraft.code.length > 0 &&
    activeDraft.role_type.length > 0 &&
    activeDraft.display_name.length > 0;

  const suggestCodeForCreate = (roleType: string, displayName: string) =>
    suggestUniqueRoleCode({
      roleType,
      displayName,
      existingCodes: existingRoleCodes,
    });

  const assignableCatalogBlocking =
    umCapabilityRead && editorMode !== null && (capabilitiesQuery.isPending || capabilitiesQuery.isError);
  const roleCapabilitiesBlocking =
    !isCreateMode &&
    (isEditMode || isViewMode) &&
    umRoleRead &&
    (roleCapabilitiesQuery.isPending || roleCapabilitiesQuery.isError);

  const canSaveDialog = isCreateMode
    ? saveEnabled && !savePending && !assignableCatalogBlocking
    : saveEnabled &&
      selectedRole !== null &&
      editorDirty &&
      !savePending &&
      !roleCapabilitiesBlocking &&
      (!umCapabilityRead || !assignableCatalogBlocking);

  const resetCapabilityFilters = () => setCapabilitySearch('');

  const resetCreateEditorState = () => {
    dispatch({ type: 'resetCreateForm' });
    dispatch({ type: 'setSelectedCapabilityIds', capabilityIds: [] });
    resetCapabilityFilters();
    setCreateFormSession((session) => session + 1);
  };

  const openCreateEditor = () => {
    if (!umRoleCreate) return;
    resetCreateEditorState();
    setEditorMode('create');
  };

  const openRoleEditor = (roleId: string, mode: 'edit' | 'view') => {
    dispatch({ type: 'selectRole', roleId });
    dispatch({ type: 'setSelectedCapabilityIds', capabilityIds: [] });
    resetCapabilityFilters();
    setEditorMode(mode);
  };

  const handleSelectRole = (roleId: string) => {
    if (!umRolesAdmin) return;
    if (umRoleUpdate) {
      openRoleEditor(roleId, 'edit');
    } else if (umRoleRead) {
      openRoleEditor(roleId, 'view');
    }
  };

  const closeEditor = () => {
    resetCapabilityFilters();
    if (isCreateMode) {
      resetCreateEditorState();
    } else if (selectedRole) {
      dispatch({ type: 'hydrateEditForm', role: selectedRole });
      dispatch({ type: 'setSelectedCapabilityIds', capabilityIds: assignedCapabilityIds });
    }
    setEditorMode(null);
  };

  async function persistRoleCapabilities(roleId: string, capabilityIds: string[]): Promise<void> {
    const capabilities = await apiClient<Capability[]>(
      `${UM_BASE}/roles/${encodeURIComponent(roleId)}/capabilities`,
      { method: 'PUT', body: JSON.stringify({ capability_ids: capabilityIds }) },
      { tenantIdOverride: iqTenantId },
    );
    qc.setQueryData(userManagementKeys.roleCapabilities(roleId), capabilities);
    qc.invalidateQueries({ queryKey: userManagementKeys.roleCapabilities(roleId) }).catch(() => {});
  }

  const handleDeleteRole = () => {
    if (!selectedRole) return;
    const nextRoleId = roles.find((r) => r.id !== selectedRole.id)?.id ?? '';
    deleteRole.mutate(selectedRole.id, {
      onSuccess: () => {
        toast.success(`Role "${selectedRole.display_name}" deleted`);
        setDeleteRoleDialogOpen(false);
        setEditorMode(null);
        dispatch({ type: 'selectRole', roleId: nextRoleId });
      },
      onError: (err) => toast.error(tenantRoleMutationError(err)),
    });
  };

  const handleResetEditor = () => {
    if (isCreateMode) {
      resetCreateEditorState();
      return;
    }
    dispatch({ type: 'hydrateEditForm', role: selectedRole });
    dispatch({ type: 'setSelectedCapabilityIds', capabilityIds: assignedCapabilityIds });
  };

  const handleSaveEditor = async () => {
    if (!canSaveDialog || isViewMode) return;
    if (isCreateMode && !umRoleCreate) return;
    if (isEditMode && !umRoleUpdate) return;

    setDialogSavePending(true);
    try {
      let savedRole: UmRole;
      const createRoleDraft = normalizeRoleDraft(state.createRoleForm);

      if (isCreateMode) {
        savedRole = await createRole.mutateAsync(createRoleDraft);
        if (umCapabilityRead && umRoleCreate && state.selectedCapabilityIds.length > 0) {
          await persistRoleCapabilities(savedRole.id, state.selectedCapabilityIds);
        }
        toast.success(`Role "${savedRole.display_name}" created`);
      } else {
        if (!selectedRole) return;
        savedRole = editRoleDirty ? await updateRole.mutateAsync(editRoleDraft) : selectedRole;
        if (umCapabilityRead && umRoleUpdate && capabilitiesDirty) {
          await persistRoleCapabilities(savedRole.id, state.selectedCapabilityIds);
        }
        toast.success(`Role "${savedRole.display_name}" updated`);
      }

      dispatch({ type: 'selectRole', roleId: savedRole.id });
      setRoleSearch('');
      closeEditor();
    } catch (err) {
      toast.error(tenantRoleMutationError(err));
    } finally {
      setDialogSavePending(false);
    }
  };

  if (error) {
    return (
      <p className="text-sm text-destructive">Failed to load role templates: {error.message}</p>
    );
  }

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading roles…</p>;
  }

  return (
    <>
      <RoleListSection
        roles={filteredRoles}
        totalRoleCount={roles.length}
        roleSearch={roleSearch}
        selectedRoleId={state.selectedRoleId}
        onRoleSearchChange={setRoleSearch}
        onSelectRole={handleSelectRole}
        onCreateRole={openCreateEditor}
      />

      {editorMode ? (
        <RoleEditorDialog
          key={isCreateMode ? `create-${createFormSession}` : `role-${selectedRole?.id ?? 'none'}`}
          open={editorOpen}
          mode={editorMode}
          role={selectedRole}
          roleType={activeForm.roleType}
          code={activeForm.code}
          displayName={activeForm.displayName}
          description={activeForm.description}
          selectedCapabilityIds={state.selectedCapabilityIds}
          assignedCapabilityIds={assignedCapabilityIds}
          assignedCount={isCreateMode ? 0 : assignedCapabilityIds.length}
          visibleCount={visibleCapabilityIds.length}
          totalCapabilityCount={editableCapabilities.length}
          isDirty={editorDirty}
          savePending={savePending}
          saveDisabled={!canSaveDialog}
          deletePending={deleteRole.isPending}
          assignedCapabilitiesPending={
            isEditMode || isViewMode ? roleCapabilitiesQuery.isPending : false
          }
          assignedCapabilitiesError={
            isEditMode || isViewMode ? roleCapabilitiesQuery.isError : false
          }
          assignableCatalogPending={umCapabilityRead && capabilitiesQuery.isPending}
          assignableCatalogError={umCapabilityRead && capabilitiesQuery.isError}
          showCapabilityProvenance={umCapabilityRead}
          productOnly
          onRetryAssignableCatalog={() => {
            void qc.invalidateQueries({ queryKey: userManagementKeys.assignableCapabilities() });
          }}
          capabilitySearch={capabilitySearch}
          capabilities={filteredCapabilities}
          onOpenChange={(open) => {
            if (!open) closeEditor();
          }}
          onRoleTypeChange={(value) => {
            dispatch({
              type: isCreateMode ? 'updateCreateField' : 'updateEditField',
              field: 'roleType',
              value,
            });
            if (isCreateMode && !state.createCodeManuallyEdited) {
              dispatch({
                type: 'updateCreateField',
                field: 'code',
                value: suggestCodeForCreate(value, activeForm.displayName),
              });
            }
          }}
          onCodeChange={(value) =>
            dispatch({
              type: isCreateMode ? 'updateCreateField' : 'updateEditField',
              field: 'code',
              value: toRoleCodeSlug(value),
            })
          }
          onDisplayNameChange={(value) => {
            dispatch({
              type: isCreateMode ? 'updateCreateField' : 'updateEditField',
              field: 'displayName',
              value,
            });
            if (isCreateMode && !state.createCodeManuallyEdited && state.createRoleForm.roleType !== '') {
              dispatch({
                type: 'updateCreateField',
                field: 'code',
                value: suggestCodeForCreate(state.createRoleForm.roleType, value),
              });
            }
          }}
          onDescriptionChange={(value) =>
            dispatch({
              type: isCreateMode ? 'updateCreateField' : 'updateEditField',
              field: 'description',
              value,
            })
          }
          onCapabilitySearchChange={setCapabilitySearch}
          onSetSelectedCapabilityIds={(capabilityIds) =>
            dispatch({ type: 'setSelectedCapabilityIds', capabilityIds })
          }
          onToggleCapability={(capabilityId) =>
            dispatch({ type: 'toggleCapability', capabilityId })
          }
          onReset={handleResetEditor}
          onSave={() => void handleSaveEditor()}
          onDelete={() => setDeleteRoleDialogOpen(true)}
        />
      ) : null}

      <ConfirmDialog
        open={deleteRoleDialogOpen}
        onOpenChange={setDeleteRoleDialogOpen}
        title="Delete role?"
        description={
          selectedRole
            ? `"${selectedRole.display_name}" will be removed. People who already had this role keep the access they were given.`
            : 'This role will be removed.'
        }
        confirmLabel={deleteRole.isPending ? 'Deleting...' : 'Delete role'}
        destructive
        onConfirm={handleDeleteRole}
      />
    </>
  );
}

export function TenantBillingPanel({ iqTenantId }: { iqTenantId: string }) {
  const { canCreate, canUpdate } = useCatalogModuleCrud('tariff-master', {
    productModuleSlug: 'billing-and-finance',
  });
  const [search, setSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editing, setEditing] = useState<TariffService | null>(null);

  const listParams = useMemo(
    () => ({ q: search || undefined, limit: 50 }),
    [search],
  );
  const { data, isLoading, error } = useTariffServices(listParams, {
    iqTenantId,
  });
  const services = data?.data ?? [];
  const createMutation = useCreateTariffService(iqTenantId);
  const updateMutation = useUpdateTariffService(iqTenantId);
  const departmentsQuery = useDepartments(undefined, {
    enabled: isCreateOpen,
    iqTenantId,
    formCatalog: true,
  });

  const createForm = useForm<TariffServiceCreateFormValues>({
    resolver: zodResolver(tariffServiceCreateSchema),
    defaultValues: EMPTY_TARIFF_CREATE_VALUES,
  });
  const editForm = useForm<TariffServiceEditFormValues>({
    resolver: zodResolver(tariffServiceEditSchema),
    defaultValues: EMPTY_TARIFF_EDIT_VALUES,
  });

  const columns = useMemo<ColumnDef<TariffService, unknown>[]>(
    () => [
      {
        accessorKey: 'service_code',
        header: 'Code',
        cell: ({ getValue }) => <code className="text-xs">{getValue<string>()}</code>,
      },
      { accessorKey: 'service_name', header: 'Name' },
      {
        accessorKey: 'category',
        header: 'Category',
        cell: ({ getValue }) => getValue<string | null>() ?? '—',
      },
      {
        accessorKey: 'base_price',
        header: 'Price',
        cell: ({ getValue }) => formatMoneyDisplay(getValue<string>()),
      },
      {
        accessorKey: 'is_active',
        header: 'Active',
        cell: ({ row }) => (
          <TableActiveToggle
            active={row.original.is_active}
            disabled={updateMutation.isPending || !canUpdate}
            onCheckedChange={(next) => {
              if (next === row.original.is_active) return;
              updateMutation.mutate(
                { id: row.original.id, input: { is_active: next } },
                {
                  onSuccess: () => toast.success(next ? 'Activated' : 'Deactivated'),
                  onError: (err) => toast.error(billingMutationError(err)),
                },
              );
            }}
          />
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <EntityRowActions
            onView={() => {
              setEditing(row.original);
              editForm.reset(serviceToEditFormValues(row.original));
            }}
            onEdit={() => {
              setEditing(row.original);
              editForm.reset(serviceToEditFormValues(row.original));
            }}
            onDelete={() => {}}
            canEdit={canUpdate}
            canDelete={false}
          />
        ),
      },
    ],
    [canUpdate, editForm, updateMutation],
  );

  if (error) {
    return <p className="text-sm text-destructive">Failed to load billing: {error.message}</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {canCreate ? (
          <Button
            size="sm"
            onClick={() => {
              createForm.reset(EMPTY_TARIFF_CREATE_VALUES);
              setIsCreateOpen(true);
            }}
          >
            <Plus className="size-4 mr-1" />
            Add service
          </Button>
        ) : null}
      </div>
      <EntityTableToolbar value={search} onChange={setSearch} placeholder="Search services…" />
      <div className="rounded-lg border">
        <DataTable
          columns={columns}
          data={services}
          isLoading={isLoading}
          emptyTitle="No tariff services"
          emptyDescription="Add chargeable services for this tenant."
        />
      </div>

      <EntityFormDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        title="Add tariff service"
        description="Create a chargeable service for this tenant."
        submitLabel="Create"
        isSubmitting={createMutation.isPending}
        onSubmit={createForm.handleSubmit((values) => {
          createMutation.mutate(formToCreatePayload(values), {
            onSuccess: () => {
              toast.success('Service created');
              setIsCreateOpen(false);
              createForm.reset(EMPTY_TARIFF_CREATE_VALUES);
            },
            onError: (err) => toast.error(billingMutationError(err)),
          });
        })}
      >
        <TariffServiceCreateFormFields
          control={createForm.control}
          setValue={createForm.setValue}
          iqTenantId={iqTenantId}
          lookupsEnabled={isCreateOpen}
        />
      </EntityFormDialog>

      <EntityFormDialog
        open={!!editing}
        onOpenChange={(open) => !open && setEditing(null)}
        title="Edit tariff service"
        description={editing ? `Update ${editing.service_code}.` : ''}
        submitLabel="Save"
        isSubmitting={updateMutation.isPending}
        onSubmit={editForm.handleSubmit((values) => {
          if (!editing) return;
          updateMutation.mutate(
            { id: editing.id, input: formToUpdatePayload(values) },
            {
              onSuccess: () => {
                toast.success('Service updated');
                setEditing(null);
              },
              onError: (err) => toast.error(billingMutationError(err)),
            },
          );
        })}
      >
        <TariffServiceEditFormFields control={editForm.control} />
      </EntityFormDialog>
    </div>
  );
}
