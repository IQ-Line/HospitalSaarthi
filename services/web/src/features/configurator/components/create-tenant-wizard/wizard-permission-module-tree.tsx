import { Checkbox } from '@pulse/ui/checkbox';
import type { Module } from '@/features/master-data/types';
import { moduleDescriptionLine } from './wizard-helpers';
import type { MasterDataPermissionOption } from './wizard-master-data-permissions';
import {
  allPermissionIdsForModuleSubtree,
  filterChildModulesForWizardTree,
  permissionOptionsForModuleNode,
} from './wizard-module-tree';

function permissionLabel(option: MasterDataPermissionOption): string {
  return option.capabilityKey ?? `${option.moduleSlug}:${option.permissionSlug}`;
}

export function WizardPermissionModuleTree({
  roots,
  childMap,
  enabledModuleIds,
  optionsByModuleId,
  selectedCapabilityIds,
  onToggleCapability,
  onToggleModuleCapabilities,
  depth = 0,
}: {
  roots: Module[];
  childMap: Map<string | null, Module[]>;
  enabledModuleIds: Set<string>;
  optionsByModuleId: Map<string, MasterDataPermissionOption[]>;
  selectedCapabilityIds: Set<string>;
  onToggleCapability: (capabilityId: string) => void;
  onToggleModuleCapabilities: (capabilityIds: string[], selected: boolean) => void;
  depth?: number;
}) {
  return (
    <ul
      className={
        depth === 0
          ? 'grid min-w-0 max-h-[min(40rem,62vh)] grid-cols-1 gap-x-4 gap-y-3 overflow-x-hidden overflow-y-auto lg:grid-cols-2 xl:grid-cols-3'
          : 'mt-2 w-full min-w-0 space-y-2 border-l border-border/60 pl-3'
      }
    >
      {roots.map((module) => {
        const children = filterChildModulesForWizardTree(module, childMap, enabledModuleIds);
        const permissionOptions = permissionOptionsForModuleNode(
          module,
          childMap,
          enabledModuleIds,
          optionsByModuleId,
        );
        const permissionIds = permissionOptions
          .map((option) => option.runtimeCapabilityId)
          .filter((id): id is string => id !== null);
        const allSelected =
          permissionIds.length > 0 && permissionIds.every((id) => selectedCapabilityIds.has(id));
        const someSelected =
          permissionIds.length > 0 && permissionIds.some((id) => selectedCapabilityIds.has(id));
        const descLine = moduleDescriptionLine(module.description);

        return (
          <li
            key={module.id}
            className={
              depth === 0
                ? 'min-w-0 rounded-lg border border-border/80 bg-card p-3.5 shadow-sm'
                : 'min-w-0 rounded-md border border-transparent py-1 pl-0 pr-1'
            }
          >
            <ModuleTreeHeader
              module={module}
              descLine={descLine}
              permissionIds={permissionIds}
              allSelected={allSelected}
              someSelected={someSelected}
              onToggleModule={() => onToggleModuleCapabilities(permissionIds, !allSelected)}
            />

            {permissionOptions.length > 0 ? (
              <ul className="mt-2 space-y-1.5 border-l border-dashed border-border/70 pl-3">
                {permissionOptions.map((option) => {
                  const capabilityId = option.runtimeCapabilityId!;
                  return (
                    <li key={option.linkId}>
                      <label className="flex cursor-pointer items-start gap-2 text-xs">
                        <Checkbox
                          checked={selectedCapabilityIds.has(capabilityId)}
                          onCheckedChange={() => onToggleCapability(capabilityId)}
                          className="mt-0.5 size-3.5 shrink-0"
                        />
                        <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">
                          <span className="block font-medium leading-snug">
                            {option.permissionName}
                          </span>
                          <span className="mt-0.5 block font-mono text-[10px] leading-snug text-muted-foreground">
                            {permissionLabel(option)}
                          </span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            ) : null}

            {children.length > 0 ? (
              <WizardPermissionModuleTree
                roots={children}
                childMap={childMap}
                enabledModuleIds={enabledModuleIds}
                optionsByModuleId={optionsByModuleId}
                selectedCapabilityIds={selectedCapabilityIds}
                onToggleCapability={onToggleCapability}
                onToggleModuleCapabilities={onToggleModuleCapabilities}
                depth={depth + 1}
              />
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function ModuleTreeHeader({
  module,
  descLine,
  permissionIds,
  allSelected,
  someSelected,
  onToggleModule,
}: {
  module: Module;
  descLine: string | null;
  permissionIds: string[];
  allSelected: boolean;
  someSelected: boolean;
  onToggleModule: () => void;
}) {
  return (
    <div className="flex items-start gap-2.5 text-xs">
      {permissionIds.length > 0 ? (
        <Checkbox
          checked={allSelected ? true : someSelected ? 'indeterminate' : false}
          onCheckedChange={onToggleModule}
          className="mt-0.5 size-3.5 shrink-0"
        />
      ) : (
        <span className="mt-0.5 inline-block size-3.5 shrink-0" aria-hidden />
      )}
      <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">
        <span className="block font-medium leading-snug">{module.name}</span>
        <span className="mt-0.5 block font-mono text-[10px] leading-snug text-muted-foreground">
          {module.slug}
        </span>
        {descLine ? (
          <span className="mt-1 block text-[11px] leading-snug text-muted-foreground">{descLine}</span>
        ) : null}
      </span>
    </div>
  );
}
