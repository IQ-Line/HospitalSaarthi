import { Checkbox } from '@pulse/ui/checkbox';
import type { Module } from '@/features/master-data/types';
import { moduleDescriptionLine } from './wizard-helpers';

export function ModuleOverrideTree({
  roots,
  childMap,
  selected,
  toggle,
  depth = 0,
}: {
  roots: Module[];
  childMap: Map<string | null, Module[]>;
  selected: Set<string>;
  toggle: (id: string) => void;
  depth?: number;
}) {
  return (
    <ul
      className={
        depth === 0
          ? 'grid min-w-0 max-h-[min(26rem,48vh)] grid-cols-1 gap-x-4 gap-y-3 overflow-x-hidden overflow-y-auto sm:grid-cols-2'
          : 'mt-2 w-full min-w-0 space-y-2 border-l border-border/60 pl-3'
      }
    >
      {roots.map((m) => {
        const children = childMap.get(m.id) ?? [];
        const descLine = moduleDescriptionLine(m.description);
        return (
          <li
            key={m.id}
            className={
              depth === 0
                ? 'min-w-0 rounded-lg border border-border/80 bg-card p-3.5 shadow-sm'
                : 'min-w-0 rounded-md border border-transparent py-1 pl-0 pr-1 hover:bg-muted/40'
            }
          >
            <label className="flex cursor-pointer items-start gap-2.5 text-xs">
              <Checkbox
                checked={selected.has(m.id)}
                onCheckedChange={() => toggle(m.id)}
                className="mt-0.5 size-3.5 shrink-0"
              />
              <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">
                <span className="block font-medium leading-snug">{m.name}</span>
                <span className="mt-0.5 block font-mono text-[10px] leading-snug text-muted-foreground">
                  {m.slug}
                </span>
                {descLine ? (
                  <span className="mt-1 block text-[11px] leading-snug text-muted-foreground">
                    {descLine}
                  </span>
                ) : null}
              </span>
            </label>
            {children.length > 0 ? (
              <ModuleOverrideTree
                roots={children}
                childMap={childMap}
                selected={selected}
                toggle={toggle}
                depth={depth + 1}
              />
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
