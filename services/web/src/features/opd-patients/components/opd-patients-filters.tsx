import { Search, X } from 'lucide-react';
import { Button } from '@pulse/ui/button';
import { Input } from '@pulse/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@pulse/ui/select';
import { MOCK_OPD_DOCTORS } from '../mock/opd-patients.mock';
import type { OpdPatientsFilters } from '../types';

interface OpdPatientsFiltersBarProps {
  filters: OpdPatientsFilters;
  onChange: (patch: Partial<OpdPatientsFilters>) => void;
  onClear: () => void;
  showClear: boolean;
  showDoctorFilter?: boolean;
}

const SELECT_NONE = '__none__';

export function OpdPatientsFiltersBar({
  filters,
  onChange,
  onClear,
  showClear,
  showDoctorFilter = true,
}: OpdPatientsFiltersBarProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] max-w-[280px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Name/UHID/Phone/Visit ID"
            value={filters.search}
            onChange={(e) => onChange({ search: e.target.value })}
            className="pl-9"
          />
        </div>
        <Input
          type="date"
          value={filters.startDate}
          onChange={(e) => onChange({ startDate: e.target.value })}
          className="w-[150px] bg-muted/30"
          aria-label="Start date"
        />
        <Input
          type="date"
          value={filters.endDate}
          onChange={(e) => onChange({ endDate: e.target.value })}
          className="w-[150px] bg-muted/30"
          aria-label="End date"
        />
        {showDoctorFilter ? (
          <Select
            value={filters.doctorId || SELECT_NONE}
            onValueChange={(v) => onChange({ doctorId: v === SELECT_NONE ? '' : v })}
          >
            <SelectTrigger className="w-[200px] bg-muted/30">
              <SelectValue placeholder="Doctor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={SELECT_NONE}>Doctor</SelectItem>
              {MOCK_OPD_DOCTORS.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
        <Select
          value={filters.gender || SELECT_NONE}
          onValueChange={(v) => onChange({ gender: v === SELECT_NONE ? '' : v })}
        >
          <SelectTrigger className="w-[140px] bg-muted/30">
            <SelectValue placeholder="Gender" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={SELECT_NONE}>Gender</SelectItem>
            <SelectItem value="male">Male</SelectItem>
            <SelectItem value="female">Female</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filters.ageGroup || SELECT_NONE}
          onValueChange={(v) => onChange({ ageGroup: v === SELECT_NONE ? '' : v })}
        >
          <SelectTrigger className="w-[140px] bg-muted/30">
            <SelectValue placeholder="Age Group" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={SELECT_NONE}>Age Group</SelectItem>
            <SelectItem value="0-12">0-12 years</SelectItem>
            <SelectItem value="13-18">13-18 years</SelectItem>
            <SelectItem value="19-30">19-30 years</SelectItem>
            <SelectItem value="31-50">31-50 years</SelectItem>
            <SelectItem value="51+">51+ years</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filters.visitType || SELECT_NONE}
          onValueChange={(v) =>
            onChange({
              visitType: v === SELECT_NONE ? '' : (v as OpdPatientsFilters['visitType']),
            })
          }
        >
          <SelectTrigger className="w-[140px] bg-muted/30">
            <SelectValue placeholder="Visit Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={SELECT_NONE}>Visit Type</SelectItem>
            <SelectItem value="new">New Visit</SelectItem>
            <SelectItem value="followup">Follow-Up</SelectItem>
            <SelectItem value="free-followup">Free Follow-up</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filters.status || SELECT_NONE}
          onValueChange={(v) => onChange({ status: v === SELECT_NONE ? '' : v })}
        >
          <SelectTrigger className="w-[140px] bg-muted/30">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={SELECT_NONE}>Status</SelectItem>
            <SelectItem value="registered">Registered</SelectItem>
            <SelectItem value="in-progress">In-Progress</SelectItem>
            <SelectItem value="completed">Consulted</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        {showClear ? (
          <Button type="button" variant="outline" size="sm" onClick={onClear} className="gap-1.5">
            <X className="size-4 text-muted-foreground" />
            Clear
          </Button>
        ) : null}
      </div>
    </div>
  );
}
