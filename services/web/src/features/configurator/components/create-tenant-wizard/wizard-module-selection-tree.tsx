import { Badge } from '@pulse/ui/badge';
import { Button } from '@pulse/ui/button';
import { Checkbox } from '@pulse/ui/checkbox';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@pulse/ui/accordion';
import type { Module } from '@/features/master-data/types';
import { moduleDescriptionLine, moduleSubtreeSelectionState } from './wizard-helpers';

export type WizardModuleSelectionTreeProps = {
  roots: Module[];
  childMap: Map<string | null, Module[]>;
  selectedModuleIds: Set<string>;
  onToggleModule: (moduleId: string) => void;
  onSelectModuleSubtree: (moduleId: string, select: boolean) => void;
  defaultExpandedModuleIds?: string[];
};

export function WizardModuleSelectionTree({
  roots,
  childMap,
  selectedModuleIds,
  onToggleModule,
  onSelectModuleSubtree,
  defaultExpandedModuleIds = [],
}: WizardModuleSelectionTreeProps) {
  const visibleRoots = roots.filter((module) => moduleHasVisibleSubtree(module));

  if (visibleRoots.length === 0) {
    return null;
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-3">
      {visibleRoots.map((module) => (
        <Accordion
          key={module.id}
          type="multiple"
          defaultValue={defaultExpandedModuleIds}
          className="min-w-0 rounded-lg border border-border/80 bg-card px-3 shadow-sm"
        >
          <ModuleSelectionAccordionNode
            module={module}
            depth={0}
            childMap={childMap}
            selectedModuleIds={selectedModuleIds}
            onToggleModule={onToggleModule}
            onSelectModuleSubtree={onSelectModuleSubtree}
            defaultExpandedModuleIds={defaultExpandedModuleIds}
          />
        </Accordion>
      ))}
    </div>
  );
}

function moduleHasVisibleSubtree(module: Module): boolean {
  return module.is_active && !module.is_deleted;
}

function activeChildModules(
  parent: Module,
  childMap: Map<string | null, Module[]>,
): Module[] {
  return (childMap.get(parent.id) ?? []).filter((child) => child.is_active && !child.is_deleted);
}

type ModuleSelectionAccordionNodeProps = {
  module: Module;
  depth: number;
  childMap: Map<string | null, Module[]>;
  selectedModuleIds: Set<string>;
  onToggleModule: (moduleId: string) => void;
  onSelectModuleSubtree: (moduleId: string, select: boolean) => void;
  defaultExpandedModuleIds: string[];
};

function ModuleSelectionAccordionNode({
  module,
  depth,
  childMap,
  selectedModuleIds,
  onToggleModule,
  onSelectModuleSubtree,
  defaultExpandedModuleIds,
}: ModuleSelectionAccordionNodeProps) {
  const children = activeChildModules(module, childMap).filter((child) =>
    moduleHasVisibleSubtree(child),
  );
  const { ids: subtreeIds, allSelected, someSelected } = moduleSubtreeSelectionState(
    module.id,
    selectedModuleIds,
    childMap,
  );
  const selectedCount = subtreeIds.filter((id) => selectedModuleIds.has(id)).length;
  const descLine = moduleDescriptionLine(module.description);
  const levelLabel =
    module.level === 1 ? 'Product' : module.level === 2 ? 'Feature' : 'Module';

  return (
    <AccordionItem
      value={module.id}
      className={depth === 0 ? 'min-w-0 border-0' : 'min-w-0 border-b border-border/50 last:border-b-0'}
    >
      <AccordionTrigger className="py-2.5 hover:no-underline">
        <ModuleSelectionAccordionHeader
          levelLabel={levelLabel}
          name={module.name}
          slug={module.slug}
          descLine={descLine}
          selectedCount={selectedCount}
          totalCount={subtreeIds.length}
          allSelected={allSelected}
          someSelected={someSelected}
          onToggleSubtree={() => onSelectModuleSubtree(module.id, !allSelected)}
          onToggleModule={() => onToggleModule(module.id)}
        />
      </AccordionTrigger>
      <AccordionContent className="pb-3 pt-0">
        {children.length > 0 ? (
          <Accordion
            type="multiple"
            defaultValue={defaultExpandedModuleIds}
            className="w-full border-l border-border/60 pl-3"
          >
            {children.map((child) => (
              <ModuleSelectionAccordionNode
                key={child.id}
                module={child}
                depth={depth + 1}
                childMap={childMap}
                selectedModuleIds={selectedModuleIds}
                onToggleModule={onToggleModule}
                onSelectModuleSubtree={onSelectModuleSubtree}
                defaultExpandedModuleIds={defaultExpandedModuleIds}
              />
            ))}
          </Accordion>
        ) : null}
      </AccordionContent>
    </AccordionItem>
  );
}

function ModuleSelectionAccordionHeader({
  levelLabel,
  name,
  slug,
  descLine,
  selectedCount,
  totalCount,
  allSelected,
  someSelected,
  onToggleSubtree,
  onToggleModule,
}: {
  levelLabel: string;
  name: string;
  slug: string;
  descLine: string | null;
  selectedCount: number;
  totalCount: number;
  allSelected: boolean;
  someSelected: boolean;
  onToggleSubtree: () => void;
  onToggleModule: () => void;
}) {
  return (
    <div className="flex w-full min-w-0 items-start gap-2 pr-2 text-left text-xs">
      <Checkbox
        checked={allSelected ? true : someSelected ? 'indeterminate' : false}
        onCheckedChange={onToggleModule}
        className="mt-0.5 size-3.5 shrink-0"
        onClick={(event) => event.stopPropagation()}
      />
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
        <span className="mt-0.5 block text-sm font-medium leading-snug text-foreground">{name}</span>
        <span className="mt-0.5 block font-mono text-[10px] leading-snug text-muted-foreground">
          {slug}
        </span>
        {descLine ? (
          <span className="mt-1 block text-[11px] leading-snug text-muted-foreground">{descLine}</span>
        ) : null}
      </span>
      {totalCount > 0 ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 shrink-0 px-2 text-xs"
          onClick={(event) => {
            event.stopPropagation();
            onToggleSubtree();
          }}
        >
          {allSelected ? 'Clear all' : 'Select all'}
        </Button>
      ) : null}
    </div>
  );
}
