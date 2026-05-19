import { useEffect, useMemo, useReducer, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { apiClient, ApiError } from '@/lib/api-client';
import type { Capability, UmRole } from '../types';
import {
  useCreateRole,
  useDeleteRole,
  useUpdateRole,
} from '../api/mutations';
import { userManagementKeys } from '../api/keys';
import {
  assignableCapabilityCatalogOptions,
  useRoleCapabilities,
  useRolesSuspense,
} from '../api/queries';
import { canAccessRolesAdmin } from '../lib/um-permissions';
import { usePermissionsStore } from '@/stores/permissions.store';
import {
  RoleEditorDialog,
  RoleListSection,
} from './role-management-sections';

type RoleManagementPanelProps = {
  canReadRoles: boolean;
  canCreateRoles: boolean;
  canUpdateRoles: boolean;
  canDeleteRoles: boolean;
  /** GET /capabilities/assignable — tenant catalog for role editors. */
  canReadCapabilities: boolean;
};

type RoleEditorMode = 'create' | 'edit' | 'view' | null;

type RoleManagementState = {
  selectedRoleId: string;
  createCodeManuallyEdited: boolean;
  createRoleForm: {
    code: string;
    displayName: string;
    description: string;
  };
  editRoleForm: {
    code: string;
    displayName: string;
    description: string;
  };
  selectedCapabilityIds: string[];
};

type RoleManagementAction =
  | { type: 'selectRole'; roleId: string }
  | { type: 'updateCreateField'; field: keyof RoleManagementState['createRoleForm']; value: string }
  | { type: 'resetCreateForm' }
  | { type: 'hydrateEditForm'; role: UmRole | null }
  | { type: 'updateEditField'; field: keyof RoleManagementState['editRoleForm']; value: string }
  | { type: 'setSelectedCapabilityIds'; capabilityIds: string[] }
  | { type: 'toggleCapability'; capabilityId: string };

const initialState: RoleManagementState = {
  selectedRoleId: '',
  createCodeManuallyEdited: false,
  createRoleForm: {
    code: '',
    displayName: '',
    description: '',
  },
  editRoleForm: {
    code: '',
    displayName: '',
    description: '',
  },
  selectedCapabilityIds: [],
};

const BASE = '/api/user-management';

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

function toRoleCode(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeRoleDraft(role: {
  code: string;
  displayName: string;
  description: string;
}): {
  code: string;
  display_name: string;
  description: string | null;
} {
  return {
    code: role.code.trim(),
    display_name: role.displayName.trim(),
    description: role.description.trim() === '' ? null : role.description.trim(),
  };
}

function normalizeExistingRole(role: UmRole): {
  code: string;
  display_name: string;
  description: string | null;
} {
  return {
    code: role.code,
    display_name: role.display_name,
    description: role.description ?? null,
  };
}

function sameCapabilitySet(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  const rightSet = new Set(right);
  return left.every((item) => rightSet.has(item));
}

function roleMatchesSearch(role: UmRole, search: string): boolean {
  if (search === '') {
    return true;
  }

  return [role.display_name, role.code, role.description ?? ''].some((value) =>
    value.toLowerCase().includes(search),
  );
}

function capabilityMatchesSearch(capability: Capability, search: string): boolean {
  if (search === '') {
    return true;
  }

  return [
    capability.display_name,
    capability.capability_key,
    capability.module,
    capability.feature,
    capability.action,
    capability.description ?? '',
  ].some((value) => value.toLowerCase().includes(search));
}

function roleManagementReducer(
  state: RoleManagementState,
  action: RoleManagementAction,
): RoleManagementState {
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
            code: state.createCodeManuallyEdited ? state.createRoleForm.code : toRoleCode(action.value),
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
    case 'resetCreateForm':
      return {
        ...state,
        createCodeManuallyEdited: false,
        createRoleForm: initialState.createRoleForm,
      };
    case 'hydrateEditForm':
      return {
        ...state,
        editRoleForm: action.role
          ? {
              code: action.role.code,
              displayName: action.role.display_name,
              description: action.role.description ?? '',
            }
          : initialState.editRoleForm,
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

export function RoleManagementPanel({
  canReadRoles,
  canCreateRoles,
  canUpdateRoles,
  canDeleteRoles,
  canReadCapabilities,
}: RoleManagementPanelProps) {
  const qc = useQueryClient();
  const canAccessAdmin = usePermissionsStore(canAccessRolesAdmin);
  const { data: roles } = useRolesSuspense();
  const [state, dispatch] = useReducer(roleManagementReducer, initialState);
  const [editorMode, setEditorMode] = useState<RoleEditorMode>(null);
  const [deleteRoleDialogOpen, setDeleteRoleDialogOpen] = useState(false);
  const [roleSearch, setRoleSearch] = useState('');
  const [capabilitySearch, setCapabilitySearch] = useState('');
  const [dialogSavePending, setDialogSavePending] = useState(false);

  const createRole = useCreateRole();
  const deleteRole = useDeleteRole();
  const selectedRole = roles.find((role) => role.id === state.selectedRoleId) ?? null;
  const isViewMode = editorMode === 'view';
  const isEditMode = editorMode === 'edit';
  const capabilitiesQuery = useQuery({
    ...assignableCapabilityCatalogOptions(),
    enabled: canReadCapabilities && editorMode !== null,
  });
  const roleCapabilitiesQuery = useRoleCapabilities(
    state.selectedRoleId,
    canReadRoles && (isEditMode || isViewMode) && selectedRole !== null,
  );
  const updateRole = useUpdateRole(state.selectedRoleId);

  const normalizedRoleSearch = roleSearch.trim().toLowerCase();
  const filteredRoles = useMemo(
    () => roles.filter((role) => roleMatchesSearch(role, normalizedRoleSearch)),
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
      capabilityIds: roleCapabilitiesQuery.data.map((capability: Capability) => capability.id),
    });
  }, [editorMode, roleCapabilitiesQuery.data]);

  const editableCapabilities = canReadCapabilities
    ? (capabilitiesQuery.data ?? [])
    : (roleCapabilitiesQuery.data ?? []);
  const filteredCapabilities = useMemo(() => {
    const search = capabilitySearch.trim().toLowerCase();
    return editableCapabilities.filter((capability) => capabilityMatchesSearch(capability, search));
  }, [editableCapabilities, capabilitySearch]);

  const visibleCapabilityIds = useMemo(
    () => filteredCapabilities.map((capability) => capability.id),
    [filteredCapabilities],
  );
  const assignedCapabilityIds = useMemo(
    () => (roleCapabilitiesQuery.data ?? []).map((capability: Capability) => capability.id),
    [roleCapabilitiesQuery.data],
  );
  const editorOpen = editorMode !== null;
  const isCreateMode = editorMode === 'create';
  const canModifyActiveEditor =
    editorMode === 'create' ? canCreateRoles : editorMode === 'edit' ? canUpdateRoles : false;
  const activeForm = isCreateMode ? state.createRoleForm : state.editRoleForm;
  const activeDraft = normalizeRoleDraft(activeForm);
  const createHasDraft =
    state.createRoleForm.code !== '' ||
    state.createRoleForm.displayName !== '' ||
    state.createRoleForm.description !== '' ||
    state.selectedCapabilityIds.length > 0;
  const createRoleDraft = normalizeRoleDraft(state.createRoleForm);
  const editRoleDraft = normalizeRoleDraft(state.editRoleForm);
  const editRoleDirty =
    selectedRole !== null &&
    JSON.stringify(editRoleDraft) !== JSON.stringify(normalizeExistingRole(selectedRole));
  const capabilitiesDirty =
    selectedRole !== null && !sameCapabilitySet(assignedCapabilityIds, state.selectedCapabilityIds);
  const editorDirty = isCreateMode ? createHasDraft : editRoleDirty || capabilitiesDirty;
  const savePending = dialogSavePending || createRole.isPending || updateRole.isPending;
  const saveDisabled =
    canModifyActiveEditor &&
    activeDraft.code.length > 0 &&
    activeDraft.display_name.length > 0;

  const assignableCatalogBlocking =
    canReadCapabilities &&
    editorMode !== null &&
    (capabilitiesQuery.isPending || capabilitiesQuery.isError);
  const roleCapabilitiesBlocking =
    !isCreateMode &&
    (isEditMode || isViewMode) &&
    canReadRoles &&
    (roleCapabilitiesQuery.isPending || roleCapabilitiesQuery.isError);

  const canSaveDialog =
    editorMode === 'create'
      ? saveDisabled && !savePending && !assignableCatalogBlocking
      : saveDisabled &&
        selectedRole !== null &&
        editorDirty &&
        !savePending &&
        !roleCapabilitiesBlocking &&
        (!canReadCapabilities || !assignableCatalogBlocking);

  const handleToggleCapability = (capabilityId: string) => {
    dispatch({ type: 'toggleCapability', capabilityId });
  };

  const resetCapabilityFilters = () => {
    setCapabilitySearch('');
  };

  const openCreateEditor = () => {
    if (!canCreateRoles) {
      return;
    }
    dispatch({ type: 'resetCreateForm' });
    dispatch({ type: 'setSelectedCapabilityIds', capabilityIds: [] });
    resetCapabilityFilters();
    setEditorMode('create');
  };

  const openRoleEditor = (roleId: string, mode: 'edit' | 'view') => {
    dispatch({ type: 'selectRole', roleId });
    dispatch({ type: 'setSelectedCapabilityIds', capabilityIds: [] });
    resetCapabilityFilters();
    setEditorMode(mode);
  };

  const handleSelectRole = (roleId: string) => {
    if (!canAccessAdmin) {
      return;
    }
    if (canUpdateRoles) {
      openRoleEditor(roleId, 'edit');
    } else if (canReadRoles) {
      openRoleEditor(roleId, 'view');
    }
  };

  if (!canAccessAdmin) {
    return (
      <p className="text-sm text-muted-foreground">
        You do not have permission to manage roles.
      </p>
    );
  }

  const closeEditor = () => {
    resetCapabilityFilters();
    if (editorMode === 'create') {
      dispatch({ type: 'resetCreateForm' });
      dispatch({ type: 'setSelectedCapabilityIds', capabilityIds: [] });
    } else if (selectedRole) {
      dispatch({ type: 'hydrateEditForm', role: selectedRole });
      dispatch({ type: 'setSelectedCapabilityIds', capabilityIds: assignedCapabilityIds });
    }
    setEditorMode(null);
  };

  async function persistRoleCapabilities(roleId: string, capabilityIds: string[]): Promise<void> {
    const capabilities = await apiClient<Capability[]>(
      `${BASE}/roles/${encodeURIComponent(roleId)}/capabilities`,
      {
        method: 'PUT',
        body: JSON.stringify({ capability_ids: capabilityIds }),
      },
    );

    qc.setQueryData(userManagementKeys.roleCapabilities(roleId), capabilities);
    qc.invalidateQueries({ queryKey: userManagementKeys.roleCapabilities(roleId) }).catch(() => {
      /* best-effort */
    });
  }

  const handleDeleteRole = () => {
    if (!selectedRole) return;

    const nextRoleId = roles.find((role) => role.id !== selectedRole.id)?.id ?? '';

    deleteRole.mutate(selectedRole.id, {
      onSuccess: () => {
        toast.success(`Role "${selectedRole.display_name}" deleted`);
        setDeleteRoleDialogOpen(false);
        setEditorMode(null);
        dispatch({ type: 'selectRole', roleId: nextRoleId });
      },
      onError: (error) => {
        toast.error(mutationErrorMessage(error));
      },
    });
  };

  const handleResetEditor = () => {
    if (isCreateMode) {
      dispatch({ type: 'resetCreateForm' });
      dispatch({ type: 'setSelectedCapabilityIds', capabilityIds: [] });
      return;
    }

    dispatch({ type: 'hydrateEditForm', role: selectedRole });
    dispatch({ type: 'setSelectedCapabilityIds', capabilityIds: assignedCapabilityIds });
  };

  const handleSaveEditor = async () => {
    if (!canSaveDialog) {
      return;
    }

    if (editorMode === 'view') {
      return;
    }

    if (editorMode === 'create' && !canCreateRoles) {
      return;
    }

    if (editorMode === 'edit' && !canUpdateRoles) {
      return;
    }

    setDialogSavePending(true);
    try {
      let savedRole: UmRole;

      if (editorMode === 'create') {
        savedRole = await createRole.mutateAsync(createRoleDraft);
        if (canReadCapabilities && canCreateRoles) {
          await persistRoleCapabilities(savedRole.id, state.selectedCapabilityIds);
        }
        toast.success(`Role "${savedRole.display_name}" created`);
      } else {
        if (!selectedRole) {
          return;
        }

        savedRole = editRoleDirty ? await updateRole.mutateAsync(editRoleDraft) : selectedRole;
        if (canReadCapabilities && canUpdateRoles && capabilitiesDirty) {
          await persistRoleCapabilities(savedRole.id, state.selectedCapabilityIds);
        }
        toast.success(`Role "${savedRole.display_name}" updated`);
      }

      dispatch({ type: 'selectRole', roleId: savedRole.id });
      setRoleSearch('');
      closeEditor();
    } catch (error) {
      toast.error(mutationErrorMessage(error));
    } finally {
      setDialogSavePending(false);
    }
  };

  return (
    <>
      <RoleListSection
          roles={filteredRoles}
          totalRoleCount={roles.length}
          roleSearch={roleSearch}
          selectedRoleId={state.selectedRoleId}
          canCreateRoles={canCreateRoles}
          canUpdateRoles={canUpdateRoles}
          onRoleSearchChange={setRoleSearch}
          onSelectRole={handleSelectRole}
          onCreateRole={openCreateEditor}
        />

      {editorMode ? (
        <RoleEditorDialog
          open={editorOpen}
          mode={editorMode}
          role={selectedRole}
          canCreateRoles={canCreateRoles}
          canUpdateRoles={canUpdateRoles}
          canDeleteRoles={canDeleteRoles}
          canReadCapabilities={canReadCapabilities}
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
            editorMode === 'edit' || editorMode === 'view' ? roleCapabilitiesQuery.isPending : false
          }
          assignedCapabilitiesError={
            editorMode === 'edit' || editorMode === 'view' ? roleCapabilitiesQuery.isError : false
          }
          assignableCatalogPending={canReadCapabilities && capabilitiesQuery.isPending}
          assignableCatalogError={canReadCapabilities && capabilitiesQuery.isError}
          showCapabilityProvenance={canReadCapabilities}
          onRetryAssignableCatalog={() => {
            void qc.invalidateQueries({ queryKey: userManagementKeys.assignableCapabilities() });
          }}
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
          onCapabilitySearchChange={setCapabilitySearch}
          onSetSelectedCapabilityIds={(capabilityIds) =>
            dispatch({ type: 'setSelectedCapabilityIds', capabilityIds })
          }
          onToggleCapability={handleToggleCapability}
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
