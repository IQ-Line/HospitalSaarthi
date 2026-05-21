import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, LayoutGrid } from 'lucide-react';
import { SidebarNavLink } from '@/components/layout/sidebar-nav-link';
import { formatModuleNavLabel, type NavModuleTreeNode } from '@/lib/nav-modules-tree';
import { useUIPrefsStore } from '@/stores/ui-prefs.store';

interface DynamicModuleNavProps {
  nodes: NavModuleTreeNode[];
  collapsed: boolean;
  pathname: string;
}

export function DynamicModuleNav({ nodes, collapsed, pathname }: DynamicModuleNavProps) {
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set());

  const ancestorIds = useMemo(() => collectOpenSectionIds(nodes, pathname), [nodes, pathname]);

  useEffect(() => {
    if (ancestorIds.length === 0) {
      return;
    }
    setOpenIds((prev) => {
      const next = new Set(prev);
      for (const id of ancestorIds) {
        next.add(id);
      }
      return next;
    });
  }, [ancestorIds]);

  return (
    <div className="space-y-1">
      {nodes.map((node) => (
        <DynamicModuleNavNode
          key={node.module.id}
          node={node}
          depth={0}
          collapsed={collapsed}
          pathname={pathname}
          openIds={openIds}
          onToggle={(id) => {
            setOpenIds((prev) => {
              const next = new Set(prev);
              if (next.has(id)) {
                next.delete(id);
              } else {
                next.add(id);
              }
              return next;
            });
          }}
        />
      ))}
    </div>
  );
}

interface DynamicModuleNavNodeProps {
  node: NavModuleTreeNode;
  depth: number;
  collapsed: boolean;
  pathname: string;
  openIds: Set<string>;
  onToggle: (moduleId: string) => void;
}

function DynamicModuleNavNode({
  node,
  depth,
  collapsed,
  pathname,
  openIds,
  onToggle,
}: DynamicModuleNavNodeProps) {
  const expandSidebar = () => useUIPrefsStore.setState({ sidebarCollapsed: false });
  const hasChildren = node.children.length > 0;
  const label = formatModuleNavLabel(node.module.name);
  const isOpen = openIds.has(node.module.id);
  const isActive = pathname === node.path || pathname.startsWith(`${node.path}/`);

  if (!hasChildren) {
    return (
      <SidebarNavLink
        to={node.path}
        label={label}
        icon={LayoutGrid}
        collapsed={collapsed}
        indentLevel={depth}
      />
    );
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => {
          if (collapsed) {
            expandSidebar();
            return;
          }
          onToggle(node.module.id);
        }}
        className={`w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-sidebar-accent transition-colors ${
          collapsed ? 'justify-center' : ''
        } ${isActive ? 'bg-sidebar-accent font-medium' : ''}`}
        style={!collapsed && depth > 0 ? { marginLeft: `${depth * 1.5}rem` } : undefined}
        title={collapsed ? label : undefined}
      >
        <LayoutGrid className="size-4 shrink-0" />
        {!collapsed && (
          <>
            <span className="font-medium truncate">{label}</span>
            {isOpen ? (
              <ChevronDown className="size-4 ml-auto shrink-0" />
            ) : (
              <ChevronRight className="size-4 ml-auto shrink-0" />
            )}
          </>
        )}
      </button>

      {isOpen && (
        <div className="space-y-1">
          {node.children.map((child) => (
            <DynamicModuleNavNode
              key={child.module.id}
              node={child}
              depth={depth + 1}
              collapsed={collapsed}
              pathname={pathname}
              openIds={openIds}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** Module ids for expandable sections that contain the active route. */
function collectOpenSectionIds(nodes: NavModuleTreeNode[], pathname: string): string[] {
  const openIds: string[] = [];

  function walk(branch: NavModuleTreeNode[]): boolean {
    let branchMatches = false;
    for (const node of branch) {
      const selfMatches = pathname === node.path || pathname.startsWith(`${node.path}/`);
      const childMatches = node.children.length > 0 ? walk(node.children) : false;
      if (selfMatches || childMatches) {
        branchMatches = true;
        if (node.children.length > 0) {
          openIds.push(node.module.id);
        }
      }
    }
    return branchMatches;
  }

  walk(nodes);
  return openIds;
}
