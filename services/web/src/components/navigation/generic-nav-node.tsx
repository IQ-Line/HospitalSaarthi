import { useEffect, useMemo, useState } from 'react';
import { useLocation } from '@tanstack/react-router';
import { ChevronDown, ChevronRight, Circle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { SidebarNavLink } from '@/components/layout/sidebar-nav-link';
import { resolveNavigationIcon } from '@/navigation/navigation-icons';
import type { NavigationNode } from '@/navigation/types';
import { useUIPrefsStore } from '@/stores/ui-prefs.store';
import { GenericNavTree } from './generic-nav-tree';

type GenericNavNodeProps = {
  node: NavigationNode;
  collapsed: boolean;
  depth?: number;
};

/** Tailwind weight/color class for a group header at the given depth. */
function groupWeightClass(depth: number): string {
  if (depth === 0) return 'font-semibold text-foreground';
  if (depth === 1) return 'font-medium text-foreground/80';
  return 'text-foreground/70';
}

function collectAllRoutes(node: NavigationNode): string[] {
  if (node.route) return [node.route];
  const result: string[] = [];
  for (const child of node.children ?? []) {
    result.push(...collectAllRoutes(child));
  }
  return result;
}

function useNavGroupState(node: NavigationNode, enabled: boolean): {
  isActive: boolean;
  isOpen: boolean;
  toggle: () => void;
} {
  const { pathname } = useLocation();
  const routes = useMemo(() => (enabled ? collectAllRoutes(node) : []), [node, enabled]);
  const isActive = routes.some((r) => pathname.startsWith(r));
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    if (isActive) {
      setIsOpen(true);
    }
  }, [isActive]);

  return { isActive, isOpen, toggle: () => setIsOpen((prev) => !prev) };
}

/** Leading icon for a group header (manifest icon, or a placeholder circle). */
function GroupHeaderIcon({ Icon }: { Icon: LucideIcon | undefined }) {
  return Icon ? (
    <Icon className="size-4 shrink-0" />
  ) : (
    <Circle className="size-4 shrink-0 opacity-40" />
  );
}

type GenericNavGroupProps = {
  node: NavigationNode;
  collapsed: boolean;
  depth: number;
  Icon: LucideIcon | undefined;
  isActive: boolean;
  isOpen: boolean;
  toggleOpen: () => void;
};

function GenericNavGroup({
  node,
  collapsed,
  depth,
  Icon,
  isActive,
  isOpen,
  toggleOpen,
}: GenericNavGroupProps) {
  const nestedGroup = !collapsed && depth > 0;
  const activeHighlight = isActive ? 'bg-sidebar-primary/10 text-foreground' : '';
  const handleClick = () => {
    if (collapsed) {
      useUIPrefsStore.setState({ sidebarCollapsed: false });
      return;
    }
    toggleOpen();
  };

  return (
    <div className={`space-y-1${nestedGroup ? ' ml-6' : ''}`}>
      <button
        type="button"
        onClick={handleClick}
        className={`w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm ${groupWeightClass(depth)} ${activeHighlight} hover:bg-sidebar-primary/10 transition-colors ${
          collapsed ? 'justify-center' : ''
        }`}
        title={collapsed ? node.label : undefined}
      >
        <GroupHeaderIcon Icon={Icon} />
        {!collapsed && (
          <>
            <span className="truncate">{node.label}</span>
            {isOpen ? (
              <ChevronDown className="size-3.5 ml-auto shrink-0 opacity-50" />
            ) : (
              <ChevronRight className="size-3.5 ml-auto shrink-0 opacity-50" />
            )}
          </>
        )}
      </button>

      {isOpen && node.children ? (
        <GenericNavTree nodes={node.children} collapsed={collapsed} depth={depth + 1} />
      ) : null}
    </div>
  );
}

export function GenericNavNode({ node, collapsed, depth = 0 }: GenericNavNodeProps) {
  const Icon = resolveNavigationIcon(node.icon);
  const hasChildren = (node.children?.length ?? 0) > 0;
  const { isActive, isOpen, toggle: toggleOpen } = useNavGroupState(node, hasChildren);

  if (!hasChildren && node.route) {
    return (
      <SidebarNavLink
        to={node.route}
        label={node.label}
        icon={Icon}
        collapsed={collapsed}
        nested={depth > 0}
        depth={depth}
        search={node.search}
      />
    );
  }

  if (hasChildren) {
    return (
      <GenericNavGroup
        node={node}
        collapsed={collapsed}
        depth={depth}
        Icon={Icon}
        isActive={isActive}
        isOpen={isOpen}
        toggleOpen={toggleOpen}
      />
    );
  }

  return null;
}
