import { Search } from 'lucide-react';
import { Input } from '@pulse/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@pulse/ui/select';
import type { PharmacyQueueStatusFilter, PharmacyQueueDateRange } from '../types';
import { PharmacyQueueDateRangePicker } from './pharmacy-queue-date-range-picker';

export type { PharmacyQueueDateRange };

type PharmacyQueueFiltersBarProps = {
  search: string;
  status: PharmacyQueueStatusFilter;
  dateRange: PharmacyQueueDateRange;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: PharmacyQueueStatusFilter) => void;
  onDateRangeChange: (value: PharmacyQueueDateRange) => void;
};

export function PharmacyQueueFiltersBar({
  search,
  status,
  dateRange,
  onSearchChange,
  onStatusChange,
  onDateRangeChange,
}: PharmacyQueueFiltersBarProps) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Select
          value={status}
          onValueChange={(value) => onStatusChange(value as PharmacyQueueStatusFilter)}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="partial_issue">Partial issue</SelectItem>
            <SelectItem value="issued">Issued</SelectItem>
          </SelectContent>
        </Select>

        <PharmacyQueueDateRangePicker value={dateRange} onChange={onDateRangeChange} />
      </div>

      <div className="relative w-full lg:max-w-sm">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search patient, UHID, visit, Rx…"
          className="pl-9"
        />
      </div>
    </div>
  );
}
