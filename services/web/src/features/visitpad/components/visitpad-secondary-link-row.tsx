import { Link } from '@tanstack/react-router';
import { filterVisitpadManifestNodesByAccess } from '@/features/visitpad/lib/visitpad-access';
import { usePermissionsStore } from '@/stores/permissions.store';

function VisitpadSecondaryNav({ manifestNodeIds }: { manifestNodeIds: readonly string[] }) {
  const capabilityKeys = usePermissionsStore((s) => s.capabilityKeys);
  const links = filterVisitpadManifestNodesByAccess(manifestNodeIds, capabilityKeys);

  if (links.length === 0) {
    return null;
  }

  return (
    <nav className="flex flex-wrap gap-2 text-sm">
      {links.map((node) => (
        <Link
          key={node.id}
          to={node.route!}
          className="rounded-md px-2 py-1 text-foreground/70 hover:bg-muted hover:text-foreground"
          activeProps={{ className: 'rounded-md px-2 py-1 bg-muted font-medium text-foreground' }}
        >
          {node.label}
        </Link>
      ))}
    </nav>
  );
}

export function VisitpadUnitsSecondaryNav() {
  return <VisitpadSecondaryNav manifestNodeIds={['visitpad-units', 'visitpad-conversions']} />;
}

export function VisitpadAllergiesSecondaryNav() {
  return <VisitpadSecondaryNav manifestNodeIds={['visitpad-allergens', 'visitpad-reactions']} />;
}
