import { Link } from '@tanstack/react-router';
import { Circle } from 'lucide-react';
import type { ComponentType } from 'react';

function getIndentClass(
  collapsed: boolean,
  nested: boolean,
  indentLevel: number,
): string | undefined {
  if (collapsed || !(nested || indentLevel > 0)) return '';
  return indentLevel > 0 ? undefined : 'ml-6';
}

function getWeightClass(depth: number): string {
  if (depth === 0) return 'font-semibold';
  if (depth === 1) return 'font-medium';
  return '';
}

function getColorClass(depth: number): string {
  if (depth === 0) return 'text-foreground';
  if (depth === 1) return 'text-foreground/80';
  return 'text-foreground/70';
}

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
  const indentClass = getIndentClass(collapsed, nested, indentLevel);
  const indentStyle =
    !collapsed && indentLevel > 0 ? { marginLeft: `${indentLevel * 1.5}rem` } : undefined;

  const weightClass = getWeightClass(depth);
  const colorClass = getColorClass(depth);

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
