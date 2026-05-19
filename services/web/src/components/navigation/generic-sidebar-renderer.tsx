import type { NavigationNode } from '@/navigation/types';
import { GenericNavTree } from './generic-nav-tree';

type GenericSidebarRendererProps = {
  nodes: readonly NavigationNode[];
  collapsed: boolean;
};

/**
 * Renders the filtered navigation manifest in the sidebar (no module-specific branches).
 */
export function GenericSidebarRenderer({ nodes, collapsed }: GenericSidebarRendererProps) {
  return <GenericNavTree nodes={nodes} collapsed={collapsed} depth={0} />;
}
