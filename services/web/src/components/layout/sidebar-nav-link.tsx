import { Link } from '@tanstack/react-router';
import type { ComponentType } from 'react';

export function SidebarNavLink({
  to,
  label,
  icon: Icon,
  collapsed,
  nested = false,
  indentLevel = 0,
  search,
}: {
  to: string;
  label: string;
  icon?: ComponentType<{ className?: string }>;
  collapsed: boolean;
  nested?: boolean;
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

  return (
    <Link
      to={to}
      {...(search !== undefined ? { search } : {})}
      style={indentStyle}
      className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground/70 hover:bg-sidebar-accent transition-colors ${indentClass} ${
        collapsed ? 'justify-center' : ''
      }`}
      activeProps={{
        className: `flex items-center gap-2 rounded-md px-2 py-1.5 text-sm bg-sidebar-accent font-semibold text-foreground ${indentClass} ${
          collapsed ? 'justify-center' : ''
        }`,
        style: indentStyle,
      }}
      title={collapsed ? label : undefined}
    >
      {Icon && <Icon className="size-4 shrink-0" />}
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );
}
