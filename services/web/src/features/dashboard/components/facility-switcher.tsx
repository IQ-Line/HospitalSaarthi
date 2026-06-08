import { useEffect } from 'react';
import { Label } from '@pulse/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@pulse/ui/select';
import { resolveDefaultFacilityTenantId } from '../api/facilities';
import { useDashboardFacilities } from '../hooks/use-dashboard-facilities';

function isFacilityInList(
  tenantId: string | undefined,
  facilities: { tenantId: string }[],
): boolean {
  return Boolean(tenantId && facilities.some((f) => f.tenantId === tenantId));
}

interface FacilitySwitcherProps {
  selectedTenantId: string | undefined;
  homeTenantId: string | null;
  onChange: (tenantId: string) => void;
}

export function FacilitySwitcher({
  selectedTenantId,
  homeTenantId,
  onChange,
}: FacilitySwitcherProps) {
  const facilitiesQuery = useDashboardFacilities();
  const facilities = facilitiesQuery.data ?? [];

  useEffect(() => {
    if (facilitiesQuery.isPending || facilities.length === 0) {
      return;
    }
    if (isFacilityInList(selectedTenantId, facilities)) {
      return;
    }
    const defaultTenantId = resolveDefaultFacilityTenantId(facilities, homeTenantId);
    if (defaultTenantId) {
      onChange(defaultTenantId);
    }
  }, [
    facilities,
    facilitiesQuery.isPending,
    homeTenantId,
    onChange,
    selectedTenantId,
  ]);

  const displayValue = isFacilityInList(selectedTenantId, facilities)
    ? selectedTenantId
    : undefined;

  return (
    <div className="w-full max-w-sm space-y-2">
      <Label htmlFor="dashboard-facility">Facility (superadmin)</Label>
      <Select
        value={displayValue}
        onValueChange={onChange}
        disabled={facilitiesQuery.isPending || facilities.length === 0}
      >
        <SelectTrigger id="dashboard-facility">
          <SelectValue
            placeholder={
              facilitiesQuery.isPending ? 'Loading facilities…' : 'Select facility'
            }
          />
        </SelectTrigger>
        <SelectContent
          position="popper"
          side="bottom"
          align="end"
          sideOffset={4}
          avoidCollisions={false}
        >
          {facilities.map((facility) => (
            <SelectItem key={facility.tenantId} value={facility.tenantId}>
              {facility.name} ({facility.facilityId})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
