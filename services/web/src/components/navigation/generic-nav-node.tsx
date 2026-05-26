import { useEffect, useMemo, useState } from 'react';
import { useLocation } from '@tanstack/react-router';
import { ChevronDown, ChevronRight, Circle } from 'lucide-react';
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

function collectRoutePrefixes(node: NavigationNode): string[] {
  if (node.route) return [node.route];
  const result: string[] = [];
  for (const child of node.children ?? []) {
    result.push(...collectRoutePrefixes(child));
  }
  return result;
}

function commonPrefix(paths: string[]): string | undefined {
  if (paths.length === 0) return undefined;
  if (paths.length === 1) return paths[0];
  const sorted = paths.slice().sort();
  const first = sorted[0]!;
  const last = sorted[sorted.length - 1]!;
  let i = 0;
  while (i < first.length && i < last.length && first[i] === last[i]) i++;
  const prefix = first.slice(0, i);
  const lastSlash = prefix.lastIndexOf('/');
  return lastSlash > 0 ? prefix.slice(0, lastSlash) : prefix || undefined;
}

function routePrefixFromNode(node: NavigationNode): string | undefined {
  if (node.route) return node.route;
  const allRoutes = collectRoutePrefixes(node);
  return commonPrefix(allRoutes);
}

function useNavGroupState(routePrefix: string | undefined): {
  isActive: boolean;
  isOpen: boolean;
  toggle: () => void;
} {
  const { pathname } = useLocation();
  const isActive = routePrefix ? pathname.startsWith(routePrefix) : false;
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    if (isActive) {
      setIsOpen(true);
    }
  }, [isActive]);

  return { isActive, isOpen, toggle: () => setIsOpen((prev) => !prev) };
}

export function GenericNavNode({ node, collapsed, depth = 0 }: GenericNavNodeProps) {
  const Icon = resolveNavigationIcon(node.icon);
  const hasChildren = (node.children?.length ?? 0) > 0;
  const routePrefix = useMemo(() => routePrefixFromNode(node), [node]);
  const { isActive, isOpen, toggle: toggleOpen } = useNavGroupState(hasChildren ? routePrefix : undefined);
  const expandSidebar = () => useUIPrefsStore.setState({ sidebarCollapsed: false });

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
    const nestedGroup = !collapsed && depth > 0;
    const activeHighlight = isActive ? 'bg-sidebar-primary/10 text-foreground' : '';
    return (
      <div className={`space-y-1${nestedGroup ? ' ml-6' : ''}`}>
        <button
          type="button"
          onClick={() => {
            if (collapsed) {
              expandSidebar();
              return;
            }
            toggleOpen();
          }}
          className={`w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm ${depth === 0 ? 'font-semibold text-foreground' : depth === 1 ? 'font-medium text-foreground/80' : 'text-foreground/70'} ${activeHighlight} hover:bg-sidebar-primary/10 transition-colors ${
            collapsed ? 'justify-center' : ''
          }`}
          title={collapsed ? node.label : undefined}
        >
          {Icon ? (
            <Icon className="size-4 shrink-0" />
          ) : (
            <Circle className="size-4 shrink-0 opacity-40" />
          )}
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

  return null;
}
