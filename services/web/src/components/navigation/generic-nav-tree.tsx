import type { NavigationNode } from '@/navigation/types';
import { GenericNavNode } from './generic-nav-node';

type GenericNavTreeProps = {
  nodes: readonly NavigationNode[];
  collapsed: boolean;
  depth?: number;
};

export function GenericNavTree({ nodes, collapsed, depth = 0 }: GenericNavTreeProps) {
  return (
    <div className="space-y-1">
      {nodes.map((node) => (
        <GenericNavNode key={node.id} node={node} collapsed={collapsed} depth={depth} />
      ))}
    </div>
  );
}
