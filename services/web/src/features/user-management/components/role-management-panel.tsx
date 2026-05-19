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
import {
  RoleEditorDialog,
  RoleListSection,
} from './role-management-sections';

type RoleManagementPanelProps = {
  canWriteRoles: boolean;
  canReadCapabilities: boolean;
};

type RoleEditorMode = 'create' | 'edit' | null;

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
  canWriteRoles,
  canReadCapabilities,
}: RoleManagementPanelProps) {
  const qc = useQueryClient();
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
  const capabilitiesQuery = useQuery({
    ...assignableCapabilityCatalogOptions(),
    enabled: canReadCapabilities && editorMode !== null,
  });
  const roleCapabilitiesQuery = useRoleCapabilities(
    state.selectedRoleId,
    canReadCapabilities && editorMode === 'edit' && selectedRole !== null,
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
    if (editorMode !== 'edit' || !roleCapabilitiesQuery.data) return;
    dispatch({
      type: 'setSelectedCapabilityIds',
      capabilityIds: roleCapabilitiesQuery.data.map((capability: Capability) => capability.id),
    });
  }, [editorMode, roleCapabilitiesQuery.data]);

  const editableCapabilities = capabilitiesQuery.data ?? [];
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
    canWriteRoles &&
    activeDraft.code.length > 0 &&
    activeDraft.display_name.length > 0;

  const needsAssignableCatalog = Boolean(canReadCapabilities && (isCreateMode || capabilitiesDirty));
  const assignableCatalogBlocking =
    needsAssignableCatalog &&
    (capabilitiesQuery.isPending || capabilitiesQuery.isError);

  const canSaveDialog =
    editorMode === 'create'
      ? saveDisabled && !savePending && !assignableCatalogBlocking
      : saveDisabled &&
        selectedRole !== null &&
        editorDirty &&
        !savePending &&
        (!canReadCapabilities || !roleCapabilitiesQuery.isPending) &&
        !assignableCatalogBlocking;

  const handleToggleCapability = (capabilityId: string) => {
    dispatch({ type: 'toggleCapability', capabilityId });
  };

  const resetCapabilityFilters = () => {
    setCapabilitySearch('');
  };

  const openCreateEditor = () => {
    dispatch({ type: 'resetCreateForm' });
    dispatch({ type: 'setSelectedCapabilityIds', capabilityIds: [] });
    resetCapabilityFilters();
    setEditorMode('create');
  };

  const openEditEditor = (roleId: string) => {
    dispatch({ type: 'selectRole', roleId });
    dispatch({ type: 'setSelectedCapabilityIds', capabilityIds: [] });
    resetCapabilityFilters();
    setEditorMode('edit');
  };

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

    setDialogSavePending(true);
    try {
      let savedRole: UmRole;

      if (editorMode === 'create') {
        savedRole = await createRole.mutateAsync(createRoleDraft);
        if (canReadCapabilities) {
          await persistRoleCapabilities(savedRole.id, state.selectedCapabilityIds);
        }
        toast.success(`Role "${savedRole.display_name}" created`);
      } else {
        if (!selectedRole) {
          return;
        }

        savedRole = editRoleDirty ? await updateRole.mutateAsync(editRoleDraft) : selectedRole;
        if (canReadCapabilities && capabilitiesDirty) {
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
      <section className="space-y-6">
        <div>
          <h3 className="text-lg font-medium">Role template administration</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Create role templates and edit their capability bundles. Applying a template copies its
            current capabilities onto users.
          </p>
        </div>

        <RoleListSection
          roles={filteredRoles}
          totalRoleCount={roles.length}
          roleSearch={roleSearch}
          selectedRoleId={state.selectedRoleId}
          canWriteRoles={canWriteRoles}
          onRoleSearchChange={setRoleSearch}
          onSelectRole={openEditEditor}
          onCreateRole={openCreateEditor}
        />
      </section>

      {editorMode ? (
        <RoleEditorDialog
          open={editorOpen}
          mode={editorMode}
          role={selectedRole}
          canWriteRoles={canWriteRoles}
          canReadCapabilities={canReadCapabilities}
          code={activeForm.code}
          displayName={activeForm.displayName}
          description={activeForm.description}
          selectedCapabilityIds={state.selectedCapabilityIds}
          assignedCount={isCreateMode ? 0 : assignedCapabilityIds.length}
          visibleCount={visibleCapabilityIds.length}
          totalCapabilityCount={editableCapabilities.length}
          isDirty={editorDirty}
          savePending={savePending}
          saveDisabled={!canSaveDialog}
          deletePending={deleteRole.isPending}
          assignedCapabilitiesPending={editorMode === 'edit' ? roleCapabilitiesQuery.isPending : false}
          assignedCapabilitiesError={editorMode === 'edit' ? roleCapabilitiesQuery.isError : false}
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
        title="Delete role template?"
        description={
          selectedRole
            ? `Delete "${selectedRole.display_name}" and remove it from the tenant role-template library. Existing users keep any capabilities copied earlier.`
            : 'Delete the selected role template.'
        }
        confirmLabel={deleteRole.isPending ? 'Deleting...' : 'Delete template'}
        destructive
        onConfirm={handleDeleteRole}
      />
    </>
  );
}
