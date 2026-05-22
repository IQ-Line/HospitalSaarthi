import { useEffect, useMemo, useReducer, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@pulse/ui/badge';
import { Button } from '@pulse/ui/button';
import { DataTable } from '@/components/data-table';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { EntityRowActions } from '@/components/entity-table/entity-row-actions';
import { EntityTableToolbar } from '@/components/entity-table/entity-table-toolbar';
import { apiClient, ApiError } from '@/lib/api-client';
import {
  useCreateTenantSystemRole,
  useDeleteTenantSystemRole,
  useTenantSystemRoles,
  useUpdateTenantSystemRole,
} from '@/features/master-data/api/system-roles';
import type { SystemRole, SystemRoleCreateInput, SystemRoleUpdateInput } from '@/features/master-data/types';
import { rowMatchesSearch } from '@/features/master-data/table-search';
import {
  useCreateRole,
  useDeleteRole,
} from '@/features/user-management/api/mutations';
import { userManagementKeys } from '@/features/user-management/api/keys';
import {
  assignableCapabilityCatalogOptions,
  useRoleCapabilities,
  useRoles,
} from '@/features/user-management/api/queries';
import { RoleEditorDialog } from '@/features/user-management/components/role-management-sections';
import type { Capability, CreateRoleBody, UmRole, UpdateRoleBody } from '@/features/user-management/types';

const UM_BASE = '/api/user-management';

type EditorMode = 'create' | 'edit' | null;

type RoleFormState = {
  code: string;
  displayName: string;
  description: string;
  roleType: string;
};

type PanelState = {
  createCodeManuallyEdited: boolean;
  createRoleForm: RoleFormState;
  editRoleForm: RoleFormState;
  selectedCapabilityIds: string[];
};

type PanelAction =
  | { type: 'resetCreateForm' }
  | { type: 'hydrateEditForm'; role: SystemRole | null }
  | { type: 'updateCreateField'; field: keyof RoleFormState; value: string }
  | { type: 'updateEditField'; field: keyof RoleFormState; value: string }
  | { type: 'setSelectedCapabilityIds'; capabilityIds: string[] }
  | { type: 'toggleCapability'; capabilityId: string };

const emptyRoleForm = (): RoleFormState => ({
  code: '',
  displayName: '',
  description: '',
  roleType: '',
});

const initialState: PanelState = {
  createCodeManuallyEdited: false,
  createRoleForm: emptyRoleForm(),
  editRoleForm: emptyRoleForm(),
  selectedCapabilityIds: [],
};

function toRoleSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function mutationErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const body = err.body?.trim();
    if (body) {
      return body.length > 280 ? `${body.slice(0, 280)}...` : body;
    }
    return err.message;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return 'Request failed';
}

function normalizeSystemRoleDraft(form: RoleFormState) {
  return {
    slug: form.code.trim(),
    name: form.displayName.trim(),
    description: form.description.trim() === '' ? null : form.description.trim(),
    role_type: form.roleType.trim() === '' ? null : form.roleType.trim(),
  };
}

function normalizeExistingSystemRole(role: SystemRole) {
  return {
    slug: role.slug,
    name: role.name,
    description: role.description ?? null,
    role_type: role.role_type ?? null,
  };
}

function normalizeUmRoleDraft(form: RoleFormState): CreateRoleBody & UpdateRoleBody {
  return {
    code: form.code.trim(),
    display_name: form.displayName.trim(),
    description: form.description.trim() === '' ? null : form.description.trim(),
    role_type: form.roleType.trim() === '' ? null : form.roleType.trim(),
  };
}

function systemRoleToDialogRole(role: SystemRole): UmRole {
  return {
    id: role.id,
    code: role.slug,
    display_name: role.name,
    description: role.description,
    role_type: role.role_type,
    is_system: false,
    status: role.is_active ? 'active' : 'inactive',
  };
}

function findUmRoleBySlug(umRoles: UmRole[], slug: string): UmRole | null {
  const normalized = slug.trim().toLowerCase();
  return umRoles.find((role) => role.code.trim().toLowerCase() === normalized) ?? null;
}

function sameCapabilitySet(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }
  const rightSet = new Set(right);
  return left.every((item) => rightSet.has(item));
}

function panelReducer(state: PanelState, action: PanelAction): PanelState {
  switch (action.type) {
    case 'resetCreateForm':
      return {
        ...state,
        createCodeManuallyEdited: false,
        createRoleForm: emptyRoleForm(),
        selectedCapabilityIds: [],
      };
    case 'hydrateEditForm':
      return {
        ...state,
        editRoleForm: action.role
          ? {
              code: action.role.slug,
              displayName: action.role.name,
              description: action.role.description ?? '',
              roleType: action.role.role_type ?? '',
            }
          : emptyRoleForm(),
      };
    case 'updateCreateField':
      if (action.field === 'displayName') {
        return {
          ...state,
          createRoleForm: {
            ...state.createRoleForm,
            displayName: action.value,
            code: state.createCodeManuallyEdited
              ? state.createRoleForm.code
              : toRoleSlug(action.value),
          },
        };
      }
      if (action.field === 'code') {
        return {
          ...state,
          createCodeManuallyEdited: true,
          createRoleForm: {
            ...state.createRoleForm,
            code: action.value,
          },
        };
      }
      return {
        ...state,
        createRoleForm: {
          ...state.createRoleForm,
          [action.field]: action.value,
        },
      };
    case 'updateEditField':
      return {
        ...state,
        editRoleForm: {
          ...state.editRoleForm,
          [action.field]: action.value,
        },
      };
    case 'setSelectedCapabilityIds':
      return { ...state, selectedCapabilityIds: action.capabilityIds };
    case 'toggleCapability':
      return {
        ...state,
        selectedCapabilityIds: state.selectedCapabilityIds.includes(action.capabilityId)
          ? state.selectedCapabilityIds.filter((item) => item !== action.capabilityId)
          : [...state.selectedCapabilityIds, action.capabilityId],
      };
    default:
      return state;
  }
}

export function TenantRoleTemplatesPanel({ iqTenantId }: { iqTenantId: string }) {
  const qc = useQueryClient();
  const tenantId = iqTenantId.trim().toLowerCase();
  const [search, setSearch] = useState('');
  const [editorMode, setEditorMode] = useState<EditorMode>(null);
  const [editingSystemRole, setEditingSystemRole] = useState<SystemRole | null>(null);
  const [deletingSystemRole, setDeletingSystemRole] = useState<SystemRole | null>(null);
  const [capabilitySearch, setCapabilitySearch] = useState('');
  const [dialogSavePending, setDialogSavePending] = useState(false);
  const [state, dispatch] = useReducer(panelReducer, initialState);

  const {
    data: systemRolesResponse,
    isLoading,
    error,
  } = useTenantSystemRoles(true, tenantId);
  const systemRoles = systemRolesResponse?.data ?? [];

  const { data: umRoles = [] } = useRoles(tenantId);

  const createSystemRole = useCreateTenantSystemRole(tenantId);
  const updateSystemRole = useUpdateTenantSystemRole(tenantId);
  const deleteSystemRole = useDeleteTenantSystemRole(tenantId);
  const createUmRole = useCreateRole(tenantId);
  const deleteUmRole = useDeleteRole(tenantId);

  const editingUmRole = useMemo(
    () => (editingSystemRole ? findUmRoleBySlug(umRoles, editingSystemRole.slug) : null),
    [editingSystemRole, umRoles],
  );

  const capabilitiesQuery = useQuery({
    ...assignableCapabilityCatalogOptions(tenantId),
    enabled: editorMode !== null,
  });
  const roleCapabilitiesQuery = useRoleCapabilities(
    editingUmRole?.id ?? '',
    editorMode === 'edit' && editingUmRole !== null,
    tenantId,
  );

  useEffect(() => {
    if (editorMode === 'edit' && roleCapabilitiesQuery.data) {
      dispatch({
        type: 'setSelectedCapabilityIds',
        capabilityIds: roleCapabilitiesQuery.data.map((capability) => capability.id),
      });
    }
  }, [editorMode, roleCapabilitiesQuery.data]);

  const rows = useMemo(() => {
    if (!search.trim()) return systemRoles;
    return systemRoles.filter((role) =>
      rowMatchesSearch(
        search,
        role.name,
        role.slug,
        role.description ?? '',
        role.role_type ?? '',
      ),
    );
  }, [systemRoles, search]);

  const editableCapabilities = capabilitiesQuery.data ?? [];
  const filteredCapabilities = useMemo(() => {
    const normalizedSearch = capabilitySearch.trim().toLowerCase();
    if (normalizedSearch === '') {
      return editableCapabilities;
    }
    return editableCapabilities.filter((capability) =>
      [
        capability.display_name,
        capability.capability_key,
        capability.module,
        capability.feature,
        capability.action,
        capability.description ?? '',
      ].some((value) => value.toLowerCase().includes(normalizedSearch)),
    );
  }, [editableCapabilities, capabilitySearch]);

  const assignedCapabilityIds = useMemo(
    () => (roleCapabilitiesQuery.data ?? []).map((capability) => capability.id),
    [roleCapabilitiesQuery.data],
  );

  const isCreateMode = editorMode === 'create';
  const activeForm = isCreateMode ? state.createRoleForm : state.editRoleForm;
  const activeSystemDraft = normalizeSystemRoleDraft(activeForm);
  const editRoleDirty =
    editingSystemRole !== null &&
    JSON.stringify(activeSystemDraft) !== JSON.stringify(normalizeExistingSystemRole(editingSystemRole));
  const capabilitiesDirty =
    editingSystemRole !== null &&
    !sameCapabilitySet(assignedCapabilityIds, state.selectedCapabilityIds);
  const editorDirty = isCreateMode
    ? state.createRoleForm.code !== '' ||
      state.createRoleForm.displayName !== '' ||
      state.createRoleForm.description !== '' ||
      state.createRoleForm.roleType !== '' ||
      state.selectedCapabilityIds.length > 0
    : editRoleDirty || capabilitiesDirty;

  const canSaveForm =
    activeSystemDraft.slug.length > 0 &&
    activeSystemDraft.name.length > 0 &&
    (activeSystemDraft.role_type?.length ?? 0) > 0 &&
    (!isCreateMode || state.selectedCapabilityIds.length > 0);

  async function persistRoleCapabilities(roleId: string, capabilityIds: string[]): Promise<void> {
    const capabilities = await apiClient<Capability[]>(
      `${UM_BASE}/roles/${encodeURIComponent(roleId)}/capabilities`,
      {
        method: 'PUT',
        body: JSON.stringify({ capability_ids: capabilityIds }),
      },
      { tenantIdOverride: tenantId },
    );
    qc.setQueryData(
      [...userManagementKeys.roleCapabilities(roleId), tenantId],
      capabilities,
    );
  }

  async function syncRuntimeCapabilities(
    slug: string,
    umPayload: CreateRoleBody & UpdateRoleBody,
    capabilityIds: string[],
  ): Promise<void> {
    if (capabilityIds.length === 0) {
      return;
    }

    let umRole = findUmRoleBySlug(umRoles, slug);
    if (!umRole) {
      umRole = await createUmRole.mutateAsync(umPayload);
    }
    await persistRoleCapabilities(umRole.id, capabilityIds);
    await qc.invalidateQueries({ queryKey: userManagementKeys.roleList() });
  }

  async function syncRuntimeRoleMetadata(
    slug: string,
    umPayload: CreateRoleBody & UpdateRoleBody,
  ): Promise<void> {
    const existing = findUmRoleBySlug(umRoles, slug);
    if (!existing) {
      return;
    }

    await apiClient<UmRole>(
      `${UM_BASE}/roles/${encodeURIComponent(existing.id)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(umPayload),
      },
      { tenantIdOverride: tenantId },
    );
    await qc.invalidateQueries({ queryKey: userManagementKeys.roleList() });
  }

  const openCreateEditor = () => {
    dispatch({ type: 'resetCreateForm' });
    setCapabilitySearch('');
    setEditingSystemRole(null);
    setEditorMode('create');
  };

  const openEditEditor = (role: SystemRole) => {
    setEditingSystemRole(role);
    dispatch({ type: 'hydrateEditForm', role });
    dispatch({ type: 'setSelectedCapabilityIds', capabilityIds: [] });
    setCapabilitySearch('');
    setEditorMode('edit');
  };

  const closeEditor = () => {
    setEditorMode(null);
    setEditingSystemRole(null);
    setCapabilitySearch('');
    dispatch({ type: 'resetCreateForm' });
  };

  const handleSaveEditor = async () => {
    if (!canSaveForm || dialogSavePending) {
      return;
    }

    if (isCreateMode && state.selectedCapabilityIds.length === 0) {
      toast.error('Select at least one permission before creating the role.');
      return;
    }

    setDialogSavePending(true);
    try {
      const umPayload = normalizeUmRoleDraft(activeForm);

      if (isCreateMode) {
        const mdPayload: SystemRoleCreateInput = {
          name: activeSystemDraft.name,
          slug: activeSystemDraft.slug,
          description: activeSystemDraft.description,
          role_type: activeSystemDraft.role_type ?? '',
          is_template: true,
          is_active: true,
        };
        await createSystemRole.mutateAsync(mdPayload);
        try {
          await syncRuntimeCapabilities(
            activeSystemDraft.slug,
            umPayload,
            state.selectedCapabilityIds,
          );
        } catch (syncErr) {
          toast.error(
            `Role template "${activeSystemDraft.name}" was created, but runtime permissions could not be synced: ${mutationErrorMessage(syncErr)}`,
          );
          closeEditor();
          return;
        }
        toast.success(`Role template "${activeSystemDraft.name}" created`);
      } else if (editingSystemRole) {
        const mdUpdate: SystemRoleUpdateInput = {
          name: activeSystemDraft.name,
          slug: activeSystemDraft.slug,
          description: activeSystemDraft.description,
          role_type: activeSystemDraft.role_type ?? undefined,
          is_template: true,
        };
        if (editRoleDirty) {
          await updateSystemRole.mutateAsync({ id: editingSystemRole.id, input: mdUpdate });
          await syncRuntimeRoleMetadata(editingSystemRole.slug, umPayload);
        }

        if (capabilitiesDirty || (editingUmRole === null && state.selectedCapabilityIds.length > 0)) {
          try {
            await syncRuntimeCapabilities(
              activeSystemDraft.slug,
              umPayload,
              state.selectedCapabilityIds,
            );
          } catch (syncErr) {
            toast.error(
              `Role template "${activeSystemDraft.name}" was updated, but runtime permissions could not be synced: ${mutationErrorMessage(syncErr)}`,
            );
            closeEditor();
            return;
          }
        }

        toast.success(`Role template "${activeSystemDraft.name}" updated`);
      }

      closeEditor();
    } catch (err) {
      toast.error(mutationErrorMessage(err));
    } finally {
      setDialogSavePending(false);
    }
  };

  const columns = useMemo<ColumnDef<SystemRole, unknown>[]>(
    () => [
      { accessorKey: 'name', header: 'Name' },
      {
        accessorKey: 'role_type',
        header: 'Role type',
        cell: ({ getValue }) => getValue<string | null>() ?? '—',
      },
      {
        accessorKey: 'slug',
        header: 'Slug',
        cell: ({ getValue }) => <code className="text-xs">{getValue<string>()}</code>,
      },
      {
        accessorKey: 'is_active',
        header: 'Status',
        cell: ({ getValue }) => (
          <Badge variant={getValue<boolean>() ? 'default' : 'secondary'}>
            {getValue<boolean>() ? 'active' : 'inactive'}
          </Badge>
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <EntityRowActions
            onEdit={() => openEditEditor(row.original)}
            onDelete={() => setDeletingSystemRole(row.original)}
          />
        ),
      },
    ],
    [],
  );

  if (!tenantId) {
    return (
      <p className="text-sm text-destructive">
        Cannot load role templates: tenant id is missing for this organization.
      </p>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-destructive">Failed to load role templates: {error.message}</p>
    );
  }

  const dialogRole = editingSystemRole ? systemRoleToDialogRole(editingSystemRole) : null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button size="sm" onClick={openCreateEditor}>
          <Plus className="size-4 mr-1" />
          Create role template
        </Button>
      </div>
      <EntityTableToolbar value={search} onChange={setSearch} placeholder="Search role templates…" />
      <div className="rounded-lg border">
        <DataTable
          columns={columns}
          data={rows}
          isLoading={isLoading}
          emptyTitle="No role templates"
          emptyDescription="Create tenant role templates in the catalog and assign runtime capabilities."
        />
      </div>

      {editorMode ? (
        <RoleEditorDialog
          open={editorMode !== null}
          mode={editorMode}
          layout="tabbed"
          role={dialogRole}
          code={activeForm.code}
          displayName={activeForm.displayName}
          description={activeForm.description}
          roleType={activeForm.roleType}
          selectedCapabilityIds={state.selectedCapabilityIds}
          assignedCapabilityIds={assignedCapabilityIds}
          assignedCount={isCreateMode ? 0 : assignedCapabilityIds.length}
          visibleCount={filteredCapabilities.length}
          totalCapabilityCount={editableCapabilities.length}
          isDirty={editorDirty}
          savePending={
            dialogSavePending ||
            createSystemRole.isPending ||
            updateSystemRole.isPending ||
            createUmRole.isPending
          }
          saveDisabled={!canSaveForm || dialogSavePending}
          deletePending={deleteSystemRole.isPending || deleteUmRole.isPending}
          assignedCapabilitiesPending={editorMode === 'edit' && roleCapabilitiesQuery.isPending}
          assignedCapabilitiesError={editorMode === 'edit' && roleCapabilitiesQuery.isError}
          assignableCatalogPending={capabilitiesQuery.isPending}
          assignableCatalogError={capabilitiesQuery.isError}
          showCapabilityProvenance
          capabilitySearch={capabilitySearch}
          capabilities={filteredCapabilities}
          onOpenChange={(open) => {
            if (!open) {
              closeEditor();
            }
          }}
          onCodeChange={(value) =>
            dispatch({
              type: isCreateMode ? 'updateCreateField' : 'updateEditField',
              field: 'code',
              value,
            })
          }
          onDisplayNameChange={(value) =>
            dispatch({
              type: isCreateMode ? 'updateCreateField' : 'updateEditField',
              field: 'displayName',
              value,
            })
          }
          onDescriptionChange={(value) =>
            dispatch({
              type: isCreateMode ? 'updateCreateField' : 'updateEditField',
              field: 'description',
              value,
            })
          }
          onRoleTypeChange={(value) =>
            dispatch({
              type: isCreateMode ? 'updateCreateField' : 'updateEditField',
              field: 'roleType',
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
          onRetryAssignableCatalog={() => {
            void qc.invalidateQueries({
              queryKey: [...userManagementKeys.assignableCapabilities(), tenantId],
            });
          }}
          onReset={() => {
            if (isCreateMode) {
              dispatch({ type: 'resetCreateForm' });
              return;
            }
            if (editingSystemRole) {
              dispatch({ type: 'hydrateEditForm', role: editingSystemRole });
              dispatch({
                type: 'setSelectedCapabilityIds',
                capabilityIds: assignedCapabilityIds,
              });
            }
          }}
          onSave={() => void handleSaveEditor()}
          onDelete={() => editingSystemRole && setDeletingSystemRole(editingSystemRole)}
        />
      ) : null}

      <ConfirmDialog
        open={!!deletingSystemRole}
        onOpenChange={(open) => !open && setDeletingSystemRole(null)}
        title="Delete role template?"
        description={`Remove "${deletingSystemRole?.name}" from this tenant catalog.`}
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (!deletingSystemRole) return;
          try {
            await deleteSystemRole.mutateAsync(deletingSystemRole.id);
            const linkedUmRole = findUmRoleBySlug(umRoles, deletingSystemRole.slug);
            if (linkedUmRole) {
              await deleteUmRole.mutateAsync(linkedUmRole.id);
            }
            toast.success('Role template deleted');
            setDeletingSystemRole(null);
            closeEditor();
          } catch (err) {
            toast.error(mutationErrorMessage(err));
          }
        }}
      />
    </div>
  );
}
