import { Link } from '@tanstack/react-router';
import { resolveNavigationIcon } from '@/navigation/navigation-icons';
import { useNavigationDiscovery } from '@/navigation/use-navigation-discovery';

export function NavigationModuleDiscovery() {
  const routes = useNavigationDiscovery().filter((entry) => entry.route !== '/dashboard');

  if (routes.length === 0) {
    return (
      <p className="mt-6 text-sm text-muted-foreground" data-testid="nav-discovery-empty">
        No modules are visible for your current capabilities and tenant. Contact an administrator
        if you need access.
      </p>
    );
  }

  return (
    <section className="mt-6" data-testid="nav-discovery">
      <h3 className="text-sm font-medium text-foreground mb-3">Available modules</h3>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {routes.map((entry) => {
          const Icon = resolveNavigationIcon(entry.icon);
          return (
            <li key={entry.id}>
              <Link
                to={entry.route!}
                className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 text-sm hover:bg-muted/50 transition-colors"
              >
                {Icon ? <Icon className="size-4 shrink-0 text-muted-foreground" /> : null}
                <span className="font-medium">{entry.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
