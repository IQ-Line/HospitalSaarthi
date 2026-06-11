import { Search } from 'lucide-react';
import { Input } from '@pulse/ui/input';
import { cn } from '@pulse/utils';
import type { HistoricalRecordsFilters, HistoricalSearchField } from '../types';

const SEARCH_FIELDS: Array<{ id: HistoricalSearchField; label: string }> = [
  { id: 'patient_name', label: 'Patient Name' },
  { id: 'mobile_number', label: 'Mobile Number' },
  { id: 'abha_number', label: 'ABHA Number' },
  { id: 'abha_address', label: 'ABHA Address' },
  { id: 'uhid', label: 'UHID' },
];

interface HistoricalRecordsFiltersBarProps {
  filters: HistoricalRecordsFilters;
  onChange: (patch: Partial<HistoricalRecordsFilters>) => void;
}

export function HistoricalRecordsFiltersBar({
  filters,
  onChange,
}: HistoricalRecordsFiltersBarProps) {
  const searchPlaceholder =
    filters.searchField === 'patient_name'
      ? 'Enter patient name'
      : filters.searchField === 'mobile_number'
        ? 'Enter mobile number'
        : filters.searchField === 'abha_number'
          ? 'Enter ABHA number'
          : filters.searchField === 'abha_address'
            ? 'Enter ABHA address'
            : 'Enter UHID';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={filters.startDate}
            onChange={(e) => onChange({ startDate: e.target.value })}
            className="h-10 w-[130px] bg-white"
            aria-label="From date"
          />
          <span className="text-sm text-muted-foreground">to</span>
          <Input
            type="date"
            value={filters.endDate}
            onChange={(e) => onChange({ endDate: e.target.value })}
            className="h-10 w-[130px] bg-white"
            aria-label="To date"
          />
        </div>

        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filters.search}
            onChange={(e) => onChange({ search: e.target.value })}
            placeholder={searchPlaceholder}
            className="h-10 bg-white pl-9"
          />
        </div>
      </div>

      <div
        className="inline-flex flex-wrap gap-1 rounded-lg bg-gray-100 p-1"
        role="group"
        aria-label="Search by"
      >
        {SEARCH_FIELDS.map((field) => {
          const active = filters.searchField === field.id;
          return (
            <button
              key={field.id}
              type="button"
              aria-pressed={active}
              onClick={() => onChange({ searchField: field.id })}
              className={cn(
                'rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-1',
                active
                  ? 'bg-sidebar-primary/15 font-semibold text-foreground shadow-sm'
                  : 'bg-white text-foreground ring-1 ring-gray-300 hover:bg-sidebar-primary/10 active:bg-sidebar-primary/15',
              )}
            >
              {field.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
