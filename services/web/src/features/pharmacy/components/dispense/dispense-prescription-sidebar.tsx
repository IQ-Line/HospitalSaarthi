import { CheckCircle2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { Badge } from '@pulse/ui/badge';
import { Button } from '@pulse/ui/button';
import { cn } from '@pulse/utils';
import type { DispensePrescriptionCard } from '../../types/dispense-ui.types';

type DispensePrescriptionSidebarProps = {
  cards: DispensePrescriptionCard[];
  isLoading?: boolean;
};

function PrescriptionCard({ card }: { card: DispensePrescriptionCard }) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-md border p-4',
        card.issued && 'border-green-500/30 bg-green-500/5',
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium">{card.label}</span>
          <span className="text-xs text-muted-foreground">by {card.doctor_name}</span>
        </div>
        {card.issued ? (
          <Badge variant="outline" className="border-green-600 text-green-700">
            <CheckCircle2 className="mr-1 size-3" />
            Issued
          </Badge>
        ) : (
          <Badge variant="secondary">Open</Badge>
        )}
      </div>
      {card.vitals ? (
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Vitals: </span>
          {card.vitals}
        </p>
      ) : null}
      {card.complaints ? (
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Complaints: </span>
          {card.complaints}
        </p>
      ) : null}
      {card.diagnosis ? (
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Diagnosis: </span>
          {card.diagnosis}
        </p>
      ) : null}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Rx</span>
        <ul className="flex flex-col gap-2">
          {card.medicines.map((med) => (
            <li
              key={`${card.id}-${med.name}`}
              className="flex flex-col gap-0.5 rounded-md bg-muted/40 px-2.5 py-2 text-sm"
            >
              <span className="font-medium">{med.name}</span>
              <span className="text-xs text-muted-foreground">
                {med.dosage} · {med.duration}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function DispensePrescriptionSidebar({
  cards,
  isLoading = false,
}: DispensePrescriptionSidebarProps) {
  let body: ReactNode;
  if (isLoading) {
    body = <p className="text-sm text-muted-foreground">Loading prescriptions…</p>;
  } else if (cards.length === 0) {
    body = (
      <p className="rounded-md border border-dashed py-8 text-center text-sm text-muted-foreground">
        Select a patient to view prescription history.
      </p>
    );
  } else {
    body = (
      <div className="flex flex-col gap-4">
        {cards.map((card) => (
          <PrescriptionCard key={card.id} card={card} />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold">Patient&apos;s prescription</h2>
        <Button type="button" variant="link" size="sm" className="h-auto px-0" disabled>
          View all
        </Button>
      </div>
      {body}
    </div>
  );
}
