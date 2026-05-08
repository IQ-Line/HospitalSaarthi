import { Link } from '@tanstack/react-router';
import type { ComponentType } from 'react';

export function SidebarNavLink({
  to,
  label,
  icon: Icon,
  collapsed,
  nested = false,
}: {
  to: string;
  label: string;
  icon?: ComponentType<{ className?: string }>;
  collapsed: boolean;
  nested?: boolean;
}) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground/70 hover:bg-sidebar-accent transition-colors ${
        nested && !collapsed ? 'ml-6' : ''
      } ${collapsed ? 'justify-center' : ''}`}
      activeProps={{
        className: `flex items-center gap-2 rounded-md px-2 py-1.5 text-sm bg-sidebar-accent font-semibold text-foreground ${
          nested && !collapsed ? 'ml-6' : ''
        } ${collapsed ? 'justify-center' : ''}`,
      }}
      title={collapsed ? label : undefined}
    >
      {Icon && <Icon className="size-4 shrink-0" />}
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );
}
