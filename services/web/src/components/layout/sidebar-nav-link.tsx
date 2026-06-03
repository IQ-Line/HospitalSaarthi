import { Link } from '@tanstack/react-router';
import { Circle } from 'lucide-react';
import type { ComponentType } from 'react';

export function SidebarNavLink({
  to,
  label,
  icon: Icon,
  collapsed,
  nested = false,
  depth = 0,
  indentLevel = 0,
  search,
}: {
  to: string;
  label: string;
  icon?: ComponentType<{ className?: string }>;
  collapsed: boolean;
  nested?: boolean;
  depth?: number;
  /** Extra nesting depth for dynamic module trees (each level adds 1.5rem). */
  indentLevel?: number;
  search?: Record<string, unknown>;
}) {
  const indentClass =
    !collapsed && (nested || indentLevel > 0)
      ? indentLevel > 0
        ? undefined
        : 'ml-6'
      : '';
  const indentStyle =
    !collapsed && indentLevel > 0 ? { marginLeft: `${indentLevel * 1.5}rem` } : undefined;

  const weightClass =
    depth === 0 ? 'font-semibold' : depth === 1 ? 'font-medium' : '';
  const colorClass =
    depth === 0 ? 'text-foreground' : depth === 1 ? 'text-foreground/80' : 'text-foreground/70';

  const iconElement = Icon ? (
    <Icon className="size-4 shrink-0" />
  ) : (
    <Circle className="size-4 shrink-0 opacity-40" />
  );

  return (
    <Link
      to={to}
      {...(search !== undefined ? { search } : {})}
      style={indentStyle}
      className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm ${weightClass} ${colorClass} hover:bg-sidebar-primary/10 transition-colors ${indentClass} ${
        collapsed ? 'justify-center' : ''
      }`}
      activeProps={{
        className: `flex items-center gap-2 rounded-md px-2 py-1.5 text-sm ${weightClass} bg-sidebar-primary/15 text-foreground ${indentClass} ${
          collapsed ? 'justify-center' : ''
        }`,
        style: indentStyle,
      }}
      title={collapsed ? label : undefined}
    >
      {iconElement}
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );
}
