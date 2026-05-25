import { useEffect, useMemo, useState } from 'react';
import { useLocation } from '@tanstack/react-router';
import { ChevronDown, ChevronRight } from 'lucide-react';
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

function routePrefixFromNode(node: NavigationNode): string | undefined {
  if (node.route) {
    return node.route;
  }
  for (const child of node.children ?? []) {
    const prefix = routePrefixFromNode(child);
    if (!prefix) {
      continue;
    }
    // Visitpad catalog leaves share `/visitpad/*` — use product prefix for active/open state.
    if (prefix === '/visitpad' || prefix.startsWith('/visitpad/')) {
      return '/visitpad';
    }
    return prefix;
  }
  return undefined;
}

function useNavGroupOpen(routePrefix: string | undefined): [boolean, () => void] {
  const { pathname } = useLocation();
  const isActive = routePrefix ? pathname.startsWith(routePrefix) : false;
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    if (isActive) {
      setIsOpen(true);
    }
  }, [isActive]);

  return [isOpen, () => setIsOpen((prev) => !prev)];
}

export function GenericNavNode({ node, collapsed, depth = 0 }: GenericNavNodeProps) {
  const Icon = resolveNavigationIcon(node.icon);
  const hasChildren = (node.children?.length ?? 0) > 0;
  const routePrefix = useMemo(() => routePrefixFromNode(node), [node]);
  const [isOpen, toggleOpen] = useNavGroupOpen(hasChildren ? routePrefix : undefined);
  const expandSidebar = () => useUIPrefsStore.setState({ sidebarCollapsed: false });

  if (!hasChildren && node.route) {
    return (
      <SidebarNavLink
        to={node.route}
        label={node.label}
        icon={Icon}
        collapsed={collapsed}
        nested={depth > 0}
        search={node.search}
      />
    );
  }

  if (hasChildren) {
    return (
      <div className="space-y-1">
        <button
          type="button"
          onClick={() => {
            if (collapsed) {
              expandSidebar();
              return;
            }
            toggleOpen();
          }}
          className={`w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-sidebar-accent transition-colors ${
            collapsed ? 'justify-center' : ''
          }`}
          title={collapsed ? node.label : undefined}
        >
          {Icon ? <Icon className="size-4 shrink-0" /> : null}
          {!collapsed && (
            <>
              <span className="font-medium truncate">{node.label}</span>
              {isOpen ? (
                <ChevronDown className="size-4 ml-auto shrink-0" />
              ) : (
                <ChevronRight className="size-4 ml-auto shrink-0" />
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
