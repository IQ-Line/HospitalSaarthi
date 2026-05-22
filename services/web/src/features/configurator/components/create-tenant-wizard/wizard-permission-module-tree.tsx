import { Badge } from '@pulse/ui/badge';
import { Checkbox } from '@pulse/ui/checkbox';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@pulse/ui/accordion';
import type { Module } from '@/features/master-data/types';
import { moduleDescriptionLine } from './wizard-helpers';
import type { MasterDataPermissionOption } from './wizard-master-data-permissions';
import {
  filterChildModulesForWizardTree,
  permissionOptionsForModuleNode,
} from './wizard-module-tree';

function permissionLabel(option: MasterDataPermissionOption): string {
  return option.capabilityKey ?? `${option.moduleSlug}:${option.permissionSlug}`;
}

export type WizardPermissionModuleTreeProps = {
  roots: Module[];
  childMap: Map<string | null, Module[]>;
  enabledModuleIds: Set<string>;
  optionsByModuleId: Map<string, MasterDataPermissionOption[]>;
  selectedCapabilityIds: Set<string>;
  onToggleCapability: (capabilityId: string) => void;
  onToggleModuleCapabilities: (capabilityIds: string[], selected: boolean) => void;
  /** When false, only permission rows are checkable (role assignment UX). Default false. */
  moduleCheckboxes?: boolean;
  /** Accordion item values that start expanded. Default none (all closed). */
  defaultExpandedModuleIds?: string[];
  /** Multi-column grid (wizard). Single column fits dialogs and narrow panels. */
  multiColumn?: boolean;
};

export function WizardPermissionModuleTree({
  roots,
  childMap,
  enabledModuleIds,
  optionsByModuleId,
  selectedCapabilityIds,
  onToggleCapability,
  onToggleModuleCapabilities,
  moduleCheckboxes = false,
  defaultExpandedModuleIds = [],
  multiColumn = false,
}: WizardPermissionModuleTreeProps) {
  const visibleRoots = roots.filter((module) =>
    moduleHasVisibleContent(module, childMap, enabledModuleIds, optionsByModuleId),
  );

  if (visibleRoots.length === 0) {
    return null;
  }

  return (
    <div
      className={
        multiColumn
          ? 'grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3'
          : 'flex w-full min-w-0 flex-col gap-3'
      }
    >
      {visibleRoots.map((module) => (
        <Accordion
          key={module.id}
          type="multiple"
          defaultValue={defaultExpandedModuleIds}
          className="min-w-0 rounded-lg border border-border/80 bg-card px-3 shadow-sm"
        >
          <ModulePermissionAccordionNode
            module={module}
            depth={0}
            childMap={childMap}
            enabledModuleIds={enabledModuleIds}
            optionsByModuleId={optionsByModuleId}
            selectedCapabilityIds={selectedCapabilityIds}
            onToggleCapability={onToggleCapability}
            onToggleModuleCapabilities={onToggleModuleCapabilities}
            moduleCheckboxes={moduleCheckboxes}
            defaultExpandedModuleIds={defaultExpandedModuleIds}
          />
        </Accordion>
      ))}
    </div>
  );
}

function moduleHasVisibleContent(
  module: Module,
  childMap: Map<string | null, Module[]>,
  enabledModuleIds: Set<string>,
  optionsByModuleId: Map<string, MasterDataPermissionOption[]>,
): boolean {
  const permissionOptions = permissionOptionsForModuleNode(
    module,
    childMap,
    enabledModuleIds,
    optionsByModuleId,
  );
  const permissionIds = permissionOptions
    .map((option) => option.runtimeCapabilityId)
    .filter((id): id is string => id !== null);
  if (permissionIds.length > 0) {
    return true;
  }
  const children = filterChildModulesForWizardTree(module, childMap, enabledModuleIds);
  return children.some((child) =>
    moduleHasVisibleContent(child, childMap, enabledModuleIds, optionsByModuleId),
  );
}

type ModulePermissionAccordionNodeProps = {
  module: Module;
  depth: number;
  childMap: Map<string | null, Module[]>;
  enabledModuleIds: Set<string>;
  optionsByModuleId: Map<string, MasterDataPermissionOption[]>;
  selectedCapabilityIds: Set<string>;
  onToggleCapability: (capabilityId: string) => void;
  onToggleModuleCapabilities: (capabilityIds: string[], selected: boolean) => void;
  moduleCheckboxes: boolean;
  defaultExpandedModuleIds: string[];
};

function ModulePermissionAccordionNode({
  module,
  depth,
  childMap,
  enabledModuleIds,
  optionsByModuleId,
  selectedCapabilityIds,
  onToggleCapability,
  onToggleModuleCapabilities,
  moduleCheckboxes,
  defaultExpandedModuleIds,
}: ModulePermissionAccordionNodeProps) {
  const children = filterChildModulesForWizardTree(module, childMap, enabledModuleIds).filter(
    (child) => moduleHasVisibleContent(child, childMap, enabledModuleIds, optionsByModuleId),
  );
  const permissionOptions = permissionOptionsForModuleNode(
    module,
    childMap,
    enabledModuleIds,
    optionsByModuleId,
  );
  const permissionIds = permissionOptions
    .map((option) => option.runtimeCapabilityId)
    .filter((id): id is string => id !== null);
  const selectedInModule = permissionIds.filter((id) => selectedCapabilityIds.has(id)).length;
  const allSelected =
    permissionIds.length > 0 && permissionIds.every((id) => selectedCapabilityIds.has(id));
  const someSelected =
    permissionIds.length > 0 && permissionIds.some((id) => selectedCapabilityIds.has(id));
  const descLine = moduleDescriptionLine(module.description);
  const levelLabel =
    module.level === 1 ? 'Product' : module.level === 2 ? 'Feature' : 'Module';

  return (
    <AccordionItem
      value={module.id}
      className={depth === 0 ? 'min-w-0 border-0' : 'min-w-0 border-b border-border/50 last:border-b-0'}
    >
      <AccordionTrigger className="py-2.5 hover:no-underline">
        <ModuleAccordionHeader
          module={module}
          levelLabel={levelLabel}
          descLine={descLine}
          selectedCount={selectedInModule}
          totalCount={permissionIds.length}
          moduleCheckboxes={moduleCheckboxes}
          permissionIds={permissionIds}
          allSelected={allSelected}
          someSelected={someSelected}
          onToggleModule={() => onToggleModuleCapabilities(permissionIds, !allSelected)}
        />
      </AccordionTrigger>
      <AccordionContent className="pb-3 pt-0">
        {permissionOptions.length > 0 ? (
          <ul className="space-y-1.5 border-l border-dashed border-border/70 pl-3">
            {permissionOptions.map((option) => {
              const capabilityId = option.runtimeCapabilityId!;
              return (
                <li key={option.linkId}>
                  <label className="flex cursor-pointer items-start gap-2 text-xs">
                    <Checkbox
                      checked={selectedCapabilityIds.has(capabilityId)}
                      onCheckedChange={() => onToggleCapability(capabilityId)}
                      className="mt-0.5 size-3.5 shrink-0"
                      onClick={(event) => event.stopPropagation()}
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
          <Accordion
            type="multiple"
            defaultValue={defaultExpandedModuleIds}
            className={permissionOptions.length > 0 ? 'mt-3 w-full border-l border-border/60 pl-3' : 'w-full'}
          >
            {children.map((child) => (
              <ModulePermissionAccordionNode
                key={child.id}
                module={child}
                depth={depth + 1}
                childMap={childMap}
                enabledModuleIds={enabledModuleIds}
                optionsByModuleId={optionsByModuleId}
                selectedCapabilityIds={selectedCapabilityIds}
                onToggleCapability={onToggleCapability}
                onToggleModuleCapabilities={onToggleModuleCapabilities}
                moduleCheckboxes={moduleCheckboxes}
                defaultExpandedModuleIds={defaultExpandedModuleIds}
              />
            ))}
          </Accordion>
        ) : null}
      </AccordionContent>
    </AccordionItem>
  );
}

function ModuleAccordionHeader({
  module,
  levelLabel,
  descLine,
  selectedCount,
  totalCount,
  moduleCheckboxes,
  permissionIds,
  allSelected,
  someSelected,
  onToggleModule,
}: {
  module: Module;
  levelLabel: string;
  descLine: string | null;
  selectedCount: number;
  totalCount: number;
  moduleCheckboxes: boolean;
  permissionIds: string[];
  allSelected: boolean;
  someSelected: boolean;
  onToggleModule: () => void;
}) {
  return (
    <div className="flex w-full min-w-0 items-start gap-2 pr-2 text-left text-xs">
      {moduleCheckboxes && permissionIds.length > 0 ? (
        <Checkbox
          checked={allSelected ? true : someSelected ? 'indeterminate' : false}
          onCheckedChange={onToggleModule}
          className="mt-0.5 size-3.5 shrink-0"
          onClick={(event) => event.stopPropagation()}
        />
      ) : null}
      <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {levelLabel}
          </span>
          {totalCount > 0 ? (
            <Badge variant="secondary" className="h-4 px-1.5 text-[10px] font-normal">
              {selectedCount}/{totalCount}
            </Badge>
          ) : null}
        </span>
        <span className="mt-0.5 block text-sm font-medium leading-snug text-foreground">
          {module.name}
        </span>
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
