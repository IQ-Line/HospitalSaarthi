import { useEffect, useMemo, useReducer, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient, ApiError } from '@/lib/api-client';
import type { Capability, CreateRoleBody, UmRole, UpdateRoleBody } from '../types';
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

type SaveCapabilityFlags = {
  umCapabilityRead: boolean;
  umRoleCreate: boolean;
  umRoleUpdate: boolean;
};

type CreateSaveParams = {
  createRole: (draft: CreateRoleBody) => Promise<UmRole>;
  createRoleDraft: CreateRoleBody;
  selectedCapabilityIds: string[];
  persistRoleCapabilities: (roleId: string, capabilityIds: string[]) => Promise<void>;
  flags: SaveCapabilityFlags;
};

type EditSaveParams = {
  updateRole: (draft: UpdateRoleBody) => Promise<UmRole>;
  editRoleDraft: UpdateRoleBody;
  editRoleDirty: boolean;
  capabilitiesDirty: boolean;
  selectedRole: UmRole;
  selectedCapabilityIds: string[];
  persistRoleCapabilities: (roleId: string, capabilityIds: string[]) => Promise<void>;
  flags: SaveCapabilityFlags;
};

async function runCreateSave({
  createRole,
  createRoleDraft,
  selectedCapabilityIds,
  persistRoleCapabilities,
  flags,
}: CreateSaveParams): Promise<UmRole> {
  const savedRole = await createRole(createRoleDraft);
  if (flags.umCapabilityRead && flags.umRoleCreate) {
    await persistRoleCapabilities(savedRole.id, selectedCapabilityIds);
  }
  toast.success(`Role "${savedRole.display_name}" created`);
  return savedRole;
}

async function runEditSave({
  updateRole,
  editRoleDraft,
  editRoleDirty,
  capabilitiesDirty,
  selectedRole,
  selectedCapabilityIds,
  persistRoleCapabilities,
  flags,
}: EditSaveParams): Promise<UmRole> {
  const savedRole = editRoleDirty ? await updateRole(editRoleDraft) : selectedRole;
  if (flags.umCapabilityRead && flags.umRoleUpdate && capabilitiesDirty) {
    await persistRoleCapabilities(savedRole.id, selectedCapabilityIds);
  }
  toast.success(`Role "${savedRole.display_name}" updated`);
  return savedRole;
}

function computeCanModifyActiveEditor(
  editorMode: RoleEditorMode,
  umRoleCreate: boolean,
  umRoleUpdate: boolean,
): boolean {
  if (editorMode === 'create') {
    return umRoleCreate;
  }
  if (editorMode === 'edit') {
    return umRoleUpdate;
  }
  return false;
}

function computeCreateHasDraft(
  createRoleForm: RoleManagementState['createRoleForm'],
  selectedCapabilityCount: number,
): boolean {
  return (
    createRoleForm.roleType !== '' ||
    createRoleForm.code !== '' ||
    createRoleForm.displayName !== '' ||
    createRoleForm.description !== '' ||
    selectedCapabilityCount > 0
  );
}

type EditorSaveGateInput = {
  editorMode: RoleEditorMode;
  isCreateMode: boolean;
  isEditMode: boolean;
  isViewMode: boolean;
  canModifyActiveEditor: boolean;
  activeDraft: { code: string; role_type: string; display_name: string };
  selectedRole: UmRole | null;
  editorDirty: boolean;
  savePending: boolean;
  umCapabilityRead: boolean;
  umRoleRead: boolean;
  assignableCatalogQueryBlocked: boolean;
  roleCapabilitiesQueryBlocked: boolean;
};

/** Guards the save handler: requires a savable, non-view mode with the matching write permission. */
function isSaveAllowed(
  editorMode: RoleEditorMode,
  canSaveDialog: boolean,
  umRoleCreate: boolean,
  umRoleUpdate: boolean,
): boolean {
  if (!canSaveDialog || editorMode === 'view') {
    return false;
  }
  if (editorMode === 'create') {
    return umRoleCreate;
  }
  if (editorMode === 'edit') {
    return umRoleUpdate;
  }
  return false;
}

/** Whether the editor's Save action is currently allowed (mirrors the legacy inline gate). */
function computeCanSaveDialog(input: EditorSaveGateInput): boolean {
  const saveDisabled =
    input.canModifyActiveEditor &&
    input.activeDraft.code.length > 0 &&
    input.activeDraft.role_type.length > 0 &&
    input.activeDraft.display_name.length > 0;

  const assignableCatalogBlocking =
    input.umCapabilityRead && input.editorMode !== null && input.assignableCatalogQueryBlocked;

  const roleCapabilitiesBlocking =
    !input.isCreateMode &&
    (input.isEditMode || input.isViewMode) &&
    input.umRoleRead &&
    input.roleCapabilitiesQueryBlocked;

  if (input.editorMode === 'create') {
    return saveDisabled && !input.savePending && !assignableCatalogBlocking;
  }

  return (
    saveDisabled &&
    input.selectedRole !== null &&
    input.editorDirty &&
    !input.savePending &&
    !roleCapabilitiesBlocking &&
    (!input.umCapabilityRead || !assignableCatalogBlocking)
  );
}

type FieldChangeContext = {
  isCreateMode: boolean;
  createCodeManuallyEdited: boolean;
  createRoleType: string;
  suggestCode: (roleType: string, displayName: string) => string;
};

/** Actions for a role-type change: update the field, and (create + auto-code) re-suggest the code. */
function buildRoleTypeChangeActions(
  value: string,
  displayName: string,
  ctx: FieldChangeContext,
): RoleManagementAction[] {
  const actions: RoleManagementAction[] = [
    { type: ctx.isCreateMode ? 'updateCreateField' : 'updateEditField', field: 'roleType', value },
  ];
  if (ctx.isCreateMode && !ctx.createCodeManuallyEdited) {
    actions.push({
      type: 'updateCreateField',
      field: 'code',
      value: ctx.suggestCode(value, displayName),
    });
  }
  return actions;
}

/** Actions for a display-name change: update the field, and (create + auto-code + has type) re-suggest. */
function buildDisplayNameChangeActions(
  value: string,
  ctx: FieldChangeContext,
): RoleManagementAction[] {
  const actions: RoleManagementAction[] = [
    {
      type: ctx.isCreateMode ? 'updateCreateField' : 'updateEditField',
      field: 'displayName',
      value,
    },
  ];
  if (ctx.isCreateMode && !ctx.createCodeManuallyEdited && ctx.createRoleType !== '') {
    actions.push({
      type: 'updateCreateField',
      field: 'code',
      value: ctx.suggestCode(ctx.createRoleType, value),
    });
  }
  return actions;
}

/** True when the edit/view editor has loaded role capabilities to hydrate the selection from. */
function shouldHydrateSelectedCapabilities(
  editorMode: RoleEditorMode,
  data: Capability[] | undefined,
): data is Capability[] {
  return (editorMode === 'edit' || editorMode === 'view') && Boolean(data);
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

type RoleEditorBindingProps = {
  editorMode: RoleEditorMode;
  editorOpen: boolean;
  editorKey: string;
  selectedRole: UmRole | null;
  roleType: string;
  code: string;
  displayName: string;
  description: string;
  selectedCapabilityIds: string[];
  assignedCapabilityIds: string[];
  isCreateMode: boolean;
  visibleCount: number;
  totalCapabilityCount: number;
  editorDirty: boolean;
  savePending: boolean;
  canSaveDialog: boolean;
  showsAssignedCapabilities: boolean;
  roleCapabilitiesPending: boolean;
  roleCapabilitiesError: boolean;
  umCapabilityRead: boolean;
  assignableCatalogPending: boolean;
  assignableCatalogError: boolean;
  capabilitySearch: string;
  capabilities: Capability[];
  onRetryAssignableCatalog: () => void;
  onOpenChange: (open: boolean) => void;
  onRoleTypeChange: (value: string) => void;
  onCodeChange: (value: string) => void;
  onDisplayNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onCapabilitySearchChange: (value: string) => void;
  onSetSelectedCapabilityIds: (capabilityIds: string[]) => void;
  onToggleCapability: (capabilityId: string) => void;
  onReset: () => void;
  onSave: () => void;
};

/**
 * Thin presentational wrapper that assembles `RoleEditorDialog` props from the panel's controller
 * state. Renders nothing when no editor is open, mirroring the original `{editorMode ? ... : null}`.
 */
function RoleEditorBinding({
  editorMode,
  editorOpen,
  editorKey,
  selectedRole,
  roleType,
  code,
  displayName,
  description,
  selectedCapabilityIds,
  assignedCapabilityIds,
  isCreateMode,
  visibleCount,
  totalCapabilityCount,
  editorDirty,
  savePending,
  canSaveDialog,
  showsAssignedCapabilities,
  roleCapabilitiesPending,
  roleCapabilitiesError,
  umCapabilityRead,
  assignableCatalogPending,
  assignableCatalogError,
  capabilitySearch,
  capabilities,
  onRetryAssignableCatalog,
  onOpenChange,
  onRoleTypeChange,
  onCodeChange,
  onDisplayNameChange,
  onDescriptionChange,
  onCapabilitySearchChange,
  onSetSelectedCapabilityIds,
  onToggleCapability,
  onReset,
  onSave,
}: RoleEditorBindingProps) {
  if (editorMode === null) {
    return null;
  }

  return (
    <RoleEditorDialog
      key={editorKey}
      open={editorOpen}
      mode={editorMode}
      role={selectedRole}
      roleType={roleType}
      code={code}
      displayName={displayName}
      description={description}
      selectedCapabilityIds={selectedCapabilityIds}
      assignedCapabilityIds={assignedCapabilityIds}
      assignedCount={isCreateMode ? 0 : assignedCapabilityIds.length}
      visibleCount={visibleCount}
      totalCapabilityCount={totalCapabilityCount}
      isDirty={editorDirty}
      savePending={savePending}
      saveDisabled={!canSaveDialog}
      assignedCapabilitiesPending={showsAssignedCapabilities ? roleCapabilitiesPending : false}
      assignedCapabilitiesError={showsAssignedCapabilities ? roleCapabilitiesError : false}
      assignableCatalogPending={umCapabilityRead && assignableCatalogPending}
      assignableCatalogError={umCapabilityRead && assignableCatalogError}
      showCapabilityProvenance={umCapabilityRead}
      onRetryAssignableCatalog={onRetryAssignableCatalog}
      capabilitySearch={capabilitySearch}
      capabilities={capabilities}
      onOpenChange={onOpenChange}
      onRoleTypeChange={onRoleTypeChange}
      onCodeChange={onCodeChange}
      onDisplayNameChange={onDisplayNameChange}
      onDescriptionChange={onDescriptionChange}
      onCapabilitySearchChange={onCapabilitySearchChange}
      onSetSelectedCapabilityIds={onSetSelectedCapabilityIds}
      onToggleCapability={onToggleCapability}
      onReset={onReset}
      onSave={onSave}
    />
  );
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
    const data = roleCapabilitiesQuery.data;
    if (!shouldHydrateSelectedCapabilities(editorMode, data)) return;
    dispatch({
      type: 'setSelectedCapabilityIds',
      capabilityIds: data.map((capability: Capability) => capability.id),
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
  const canModifyActiveEditor = computeCanModifyActiveEditor(editorMode, umRoleCreate, umRoleUpdate);
  const activeForm = isCreateMode ? state.createRoleForm : state.editRoleForm;
  const activeDraft = normalizeRoleDraft(activeForm);
  const existingRoleCodes = useMemo(() => roles.map((r) => r.code), [roles]);
  const createHasDraft = computeCreateHasDraft(
    state.createRoleForm,
    state.selectedCapabilityIds.length,
  );
  const createRoleDraft = normalizeRoleDraft(state.createRoleForm);
  const editRoleDraft = normalizeRoleDraft(state.editRoleForm);
  const editRoleDirty =
    selectedRole !== null &&
    JSON.stringify(editRoleDraft) !== JSON.stringify(normalizeExistingRole(selectedRole));
  const capabilitiesDirty =
    selectedRole !== null && !sameCapabilitySet(assignedCapabilityIds, state.selectedCapabilityIds);
  const editorDirty = isCreateMode ? createHasDraft : editRoleDirty || capabilitiesDirty;
  const savePending = dialogSavePending || createRole.isPending || updateRole.isPending;

  const suggestCodeForCreate = (roleType: string, displayName: string) =>
    suggestUniqueRoleCode({
      roleType,
      displayName,
      existingCodes: existingRoleCodes,
    });

  const canSaveDialog = computeCanSaveDialog({
    editorMode,
    isCreateMode,
    isEditMode,
    isViewMode,
    canModifyActiveEditor,
    activeDraft,
    selectedRole,
    editorDirty,
    savePending,
    umCapabilityRead,
    umRoleRead,
    assignableCatalogQueryBlocked: capabilitiesQuery.isPending || capabilitiesQuery.isError,
    roleCapabilitiesQueryBlocked: roleCapabilitiesQuery.isPending || roleCapabilitiesQuery.isError,
  });

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

  const performActiveSave = (): Promise<UmRole> | null => {
    const flags: SaveCapabilityFlags = { umCapabilityRead, umRoleCreate, umRoleUpdate };

    if (editorMode === 'create') {
      return runCreateSave({
        createRole: createRole.mutateAsync,
        createRoleDraft,
        selectedCapabilityIds: state.selectedCapabilityIds,
        persistRoleCapabilities,
        flags,
      });
    }

    if (!selectedRole) {
      return null;
    }

    return runEditSave({
      updateRole: updateRole.mutateAsync,
      editRoleDraft,
      editRoleDirty,
      capabilitiesDirty,
      selectedRole,
      selectedCapabilityIds: state.selectedCapabilityIds,
      persistRoleCapabilities,
      flags,
    });
  };

  const handleEditorOpenChange = (open: boolean) => {
    if (!open) {
      closeEditor();
    }
  };

  const fieldChangeContext: FieldChangeContext = {
    isCreateMode,
    createCodeManuallyEdited: state.createCodeManuallyEdited,
    createRoleType: state.createRoleForm.roleType,
    suggestCode: suggestCodeForCreate,
  };

  const handleRoleTypeChange = (value: string) => {
    buildRoleTypeChangeActions(value, activeForm.displayName, fieldChangeContext).forEach(dispatch);
  };

  const handleDisplayNameChange = (value: string) => {
    buildDisplayNameChangeActions(value, fieldChangeContext).forEach(dispatch);
  };

  const handleCodeChange = (value: string) => {
    dispatch({
      type: isCreateMode ? 'updateCreateField' : 'updateEditField',
      field: 'code',
      value: toRoleCodeSlug(value),
    });
  };

  const handleDescriptionChange = (value: string) => {
    dispatch({
      type: isCreateMode ? 'updateCreateField' : 'updateEditField',
      field: 'description',
      value,
    });
  };

  const handleSaveEditor = async () => {
    if (!isSaveAllowed(editorMode, canSaveDialog, umRoleCreate, umRoleUpdate)) {
      return;
    }

    const savePromise = performActiveSave();
    if (savePromise === null) {
      return;
    }

    setDialogSavePending(true);
    try {
      const savedRole = await savePromise;
      dispatch({ type: 'selectRole', roleId: savedRole.id });
      setRoleSearch('');
      closeEditor();
    } catch (error) {
      toast.error(mutationErrorMessage(error));
    } finally {
      setDialogSavePending(false);
    }
  };

  const handleSetSelectedCapabilityIds = (capabilityIds: string[]) =>
    dispatch({ type: 'setSelectedCapabilityIds', capabilityIds });

  const handleRetryAssignableCatalog = () => {
    void qc.invalidateQueries({ queryKey: userManagementKeys.assignableCapabilities() });
  };

  const editorKey = isCreateMode
    ? `create-${createFormSession}`
    : `role-${selectedRole?.id ?? 'none'}`;
  const showsAssignedCapabilities = editorMode === 'edit' || editorMode === 'view';

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

      <RoleEditorBinding
        editorMode={editorMode}
        editorOpen={editorOpen}
        editorKey={editorKey}
        selectedRole={selectedRole}
        roleType={activeForm.roleType}
        code={activeForm.code}
        displayName={activeForm.displayName}
        description={activeForm.description}
        selectedCapabilityIds={state.selectedCapabilityIds}
        assignedCapabilityIds={assignedCapabilityIds}
        isCreateMode={isCreateMode}
        visibleCount={visibleCapabilityIds.length}
        totalCapabilityCount={editableCapabilities.length}
        editorDirty={editorDirty}
        savePending={savePending}
        canSaveDialog={canSaveDialog}
        showsAssignedCapabilities={showsAssignedCapabilities}
        roleCapabilitiesPending={roleCapabilitiesQuery.isPending}
        roleCapabilitiesError={roleCapabilitiesQuery.isError}
        umCapabilityRead={umCapabilityRead}
        assignableCatalogPending={capabilitiesQuery.isPending}
        assignableCatalogError={capabilitiesQuery.isError}
        capabilitySearch={capabilitySearch}
        capabilities={filteredCapabilities}
        onRetryAssignableCatalog={handleRetryAssignableCatalog}
        onOpenChange={handleEditorOpenChange}
        onRoleTypeChange={handleRoleTypeChange}
        onCodeChange={handleCodeChange}
        onDisplayNameChange={handleDisplayNameChange}
        onDescriptionChange={handleDescriptionChange}
        onCapabilitySearchChange={setCapabilitySearch}
        onSetSelectedCapabilityIds={handleSetSelectedCapabilityIds}
        onToggleCapability={handleToggleCapability}
        onReset={handleResetEditor}
        onSave={() => void handleSaveEditor()}
      />
    </>
  );
}
