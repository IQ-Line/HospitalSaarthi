import { Link } from '@tanstack/react-router';

export function VisitpadUnitsSecondaryNav() {
  return (
    <nav className="flex flex-wrap gap-2 text-sm">
      <Link
        to="/visitpad/units"
        className="rounded-md px-2 py-1 text-foreground/70 hover:bg-muted hover:text-foreground"
        activeProps={{ className: 'rounded-md px-2 py-1 bg-muted font-medium text-foreground' }}
      >
        Units
      </Link>
      <Link
        to="/visitpad/conversions"
        className="rounded-md px-2 py-1 text-foreground/70 hover:bg-muted hover:text-foreground"
        activeProps={{ className: 'rounded-md px-2 py-1 bg-muted font-medium text-foreground' }}
      >
        Conversions
      </Link>
    </nav>
  );
}

export function VisitpadAllergiesSecondaryNav() {
  return (
    <nav className="flex flex-wrap gap-2 text-sm">
      <Link
        to="/visitpad/allergens"
        className="rounded-md px-2 py-1 text-foreground/70 hover:bg-muted hover:text-foreground"
        activeProps={{ className: 'rounded-md px-2 py-1 bg-muted font-medium text-foreground' }}
      >
        Allergens
      </Link>
      <Link
        to="/visitpad/reactions"
        className="rounded-md px-2 py-1 text-foreground/70 hover:bg-muted hover:text-foreground"
        activeProps={{ className: 'rounded-md px-2 py-1 bg-muted font-medium text-foreground' }}
      >
        Reactions
      </Link>
    </nav>
  );
}
