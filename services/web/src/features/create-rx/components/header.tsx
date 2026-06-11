import { Search } from 'lucide-react';
import { Badge } from '@pulse/ui/badge';
import { Input } from '@pulse/ui/input';
import { useCreateRxStore } from '../create-rx.store';

function genderLetter(gender: string): string {
  if (gender === 'male') return 'M';
  if (gender === 'female') return 'F';
  return '—';
}

export function Header() {
  const context = useCreateRxStore((s) => s.context);
  const isReadOnly = useCreateRxStore((s) => s.isReadOnly);
  const priorVisitSearch = useCreateRxStore((s) => s.priorVisitSearch);
  const setPriorVisitSearch = useCreateRxStore((s) => s.setPriorVisitSearch);

  const patient = context?.patient;
  const visit = context?.visit;

  const title = patient
    ? `${patient.firstName}${patient.middleName ? ` ${patient.middleName}` : ''} ${patient.lastName} (${genderLetter(patient.gender)}, ${patient.age})`
    : 'Visit RX';

  const meta = patient
    ? `UHID : ${patient.uhid}   |   Visit ID : ${visit?.visitNumber ?? '—'}`
    : 'Select a patient to begin';

  return (
    <div className="shrink-0 bg-card pb-1">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-3">
            <h1 className="text-xl font-bold tracking-tight text-[#1e3a5f]">{title}</h1>
            <p className="text-sm text-[#717BBC]">{meta}</p>
            {isReadOnly ? (
              <Badge variant="outline" className="text-xs">
                Read Only
              </Badge>
            ) : null}
          </div>
        </div>
        <div className="relative w-full max-w-md sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search visit number"
            className="h-9 pl-9"
            disabled={!patient}
            value={priorVisitSearch}
            onChange={(e) => setPriorVisitSearch(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
