import { useEffect, useMemo, useReducer, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient, ApiError } from '@/lib/api-client';
import type { Capability, UmRole } from '../types';
import {
  useCreateRole,
  useUpdateRole,
} from '../api/mutations';
import { userManagementKeys } from '../api/keys';
import {
  assignableCapabilityCatalogOptions,
  useRoleCapabilities,
  useRolesSuspense,
} from '../api/queries';
import { useAnyCapability, useCapability } from '@/hooks/use-capability';
import {
  UM_CAPABILITY_READ,
  UM_ROLE_CREATE,
  UM_ROLE_READ,
  UM_ROLE_UPDATE,
  UM_ROLES_ADMIN_ANY,
} from '@/lib/runtime-capability-keys';
import {
  suggestUniqueRoleCode,
  toRoleCodeSlug,
} from '../lib/suggest-unique-role-code';
import {
  RoleEditorDialog,
  RoleListSection,
} from './role-management-sections';

type RoleEditorMode = 'create' | 'edit' | 'view' | null;

type RoleManagementState = {
  selectedRoleId: string;
  createCodeManuallyEdited: boolean;
  createRoleForm: {
    roleType: string;
    code: string;
    displayName: string;
    description: string;
  };
  editRoleForm: {
    roleType: string;
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
    roleType: '',
    code: '',
    displayName: '',
    description: '',
  },
  editRoleForm: {
    roleType: '',
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

function normalizeRoleDraft(role: {
  roleType: string;
  code: string;
  displayName: string;
  description: string;
}): {
  code: string;
  role_type: string;
  display_name: string;
  description: string | null;
} {
  return {
    code: role.code.trim(),
    role_type: role.roleType.trim(),
    display_name: role.displayName.trim(),
    description: role.description.trim() === '' ? null : role.description.trim(),
  };
}

function normalizeExistingRole(role: UmRole): {
  code: string;
  role_type: string;
  display_name: string;
  description: string | null;
} {
  return {
    code: role.code,
    role_type: role.role_type,
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
              roleType: action.role.role_type,
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

export function RoleManagementPanel() {
  const qc = useQueryClient();
  const umRoleRead = useCapability(UM_ROLE_READ);
  const umRoleCreate = useCapability(UM_ROLE_CREATE);
  const umRoleUpdate = useCapability(UM_ROLE_UPDATE);
  const umCapabilityRead = useCapability(UM_CAPABILITY_READ);
  const umRolesAdmin = useAnyCapability(UM_ROLES_ADMIN_ANY);
  const { data: roles } = useRolesSuspense();
  const [state, dispatch] = useReducer(roleManagementReducer, initialState);
  const [editorMode, setEditorMode] = useState<RoleEditorMode>(null);
  const [roleSearch, setRoleSearch] = useState('');
  const [capabilitySearch, setCapabilitySearch] = useState('');
  const [dialogSavePending, setDialogSavePending] = useState(false);
  /** Bumps on create reset so Radix Select remounts (avoids stale role type after Reset). */
  const [createFormSession, setCreateFormSession] = useState(0);

  const createRole = useCreateRole();
  const selectedRole = roles.find((role) => role.id === state.selectedRoleId) ?? null;
  const isViewMode = editorMode === 'view';
  const isEditMode = editorMode === 'edit';
  const capabilitiesQuery = useQuery({
    ...assignableCapabilityCatalogOptions(),
    enabled: umCapabilityRead && editorMode !== null,
  });
  const roleCapabilitiesQuery = useRoleCapabilities(
    state.selectedRoleId,
    umRoleRead && (isEditMode || isViewMode) && selectedRole !== null,
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

  const editableCapabilities = umCapabilityRead
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
    editorMode === 'create' ? umRoleCreate : editorMode === 'edit' ? umRoleUpdate : false;
  const activeForm = isCreateMode ? state.createRoleForm : state.editRoleForm;
  const activeDraft = normalizeRoleDraft(activeForm);
  const existingRoleCodes = useMemo(() => roles.map((r) => r.code), [roles]);
  const createHasDraft =
    state.createRoleForm.roleType !== '' ||
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
    activeDraft.role_type.length > 0 &&
    activeDraft.display_name.length > 0;

  const suggestCodeForCreate = (roleType: string, displayName: string) =>
    suggestUniqueRoleCode({
      roleType,
      displayName,
      existingCodes: existingRoleCodes,
    });

  const assignableCatalogBlocking =
    umCapabilityRead &&
    editorMode !== null &&
    (capabilitiesQuery.isPending || capabilitiesQuery.isError);
  const roleCapabilitiesBlocking =
    !isCreateMode &&
    (isEditMode || isViewMode) &&
    umRoleRead &&
    (roleCapabilitiesQuery.isPending || roleCapabilitiesQuery.isError);

  const canSaveDialog =
    editorMode === 'create'
      ? saveDisabled && !savePending && !assignableCatalogBlocking
      : saveDisabled &&
        selectedRole !== null &&
        editorDirty &&
        !savePending &&
        !roleCapabilitiesBlocking &&
        (!umCapabilityRead || !assignableCatalogBlocking);

  const handleToggleCapability = (capabilityId: string) => {
    dispatch({ type: 'toggleCapability', capabilityId });
  };

  const resetCapabilityFilters = () => {
    setCapabilitySearch('');
  };

  const resetCreateEditorState = () => {
    dispatch({ type: 'resetCreateForm' });
    dispatch({ type: 'setSelectedCapabilityIds', capabilityIds: [] });
    resetCapabilityFilters();
    setCreateFormSession((session) => session + 1);
  };

  const openCreateEditor = () => {
    if (!umRoleCreate) {
      return;
    }
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
    if (!umRolesAdmin) {
      return;
    }
    if (umRoleUpdate) {
      openRoleEditor(roleId, 'edit');
    } else if (umRoleRead) {
      openRoleEditor(roleId, 'view');
    }
  };

  if (!umRolesAdmin) {
    return (
      <p className="text-sm text-muted-foreground">
        You do not have permission to manage roles.
      </p>
    );
  }

  const closeEditor = () => {
    resetCapabilityFilters();
    if (editorMode === 'create') {
      resetCreateEditorState();
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

  const handleResetEditor = () => {
    if (isCreateMode) {
      resetCreateEditorState();
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

    if (editorMode === 'create' && !umRoleCreate) {
      return;
    }

    if (editorMode === 'edit' && !umRoleUpdate) {
      return;
    }

    setDialogSavePending(true);
    try {
      let savedRole: UmRole;

      if (editorMode === 'create') {
        savedRole = await createRole.mutateAsync(createRoleDraft);
        if (umCapabilityRead && umRoleCreate) {
          await persistRoleCapabilities(savedRole.id, state.selectedCapabilityIds);
        }
        toast.success(`Role "${savedRole.display_name}" created`);
      } else {
        if (!selectedRole) {
          return;
        }

        savedRole = editRoleDirty ? await updateRole.mutateAsync(editRoleDraft) : selectedRole;
        if (umCapabilityRead && umRoleUpdate && capabilitiesDirty) {
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
          assignedCapabilitiesPending={
            editorMode === 'edit' || editorMode === 'view' ? roleCapabilitiesQuery.isPending : false
          }
          assignedCapabilitiesError={
            editorMode === 'edit' || editorMode === 'view' ? roleCapabilitiesQuery.isError : false
          }
          assignableCatalogPending={umCapabilityRead && capabilitiesQuery.isPending}
          assignableCatalogError={umCapabilityRead && capabilitiesQuery.isError}
          showCapabilityProvenance={umCapabilityRead}
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
          onRoleTypeChange={(value) => {
            dispatch({
              type: isCreateMode ? 'updateCreateField' : 'updateEditField',
              field: 'roleType',
              value,
            });
            if (isCreateMode && !state.createCodeManuallyEdited) {
              const displayName = activeForm.displayName;
              dispatch({
                type: 'updateCreateField',
                field: 'code',
                value: suggestCodeForCreate(value, displayName),
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
          onToggleCapability={handleToggleCapability}
          onReset={handleResetEditor}
          onSave={() => void handleSaveEditor()}
        />
      ) : null}
    </>
  );
}
