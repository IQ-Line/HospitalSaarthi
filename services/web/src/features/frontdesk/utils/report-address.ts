import type { VisitRegistrationAddressBlock } from '@/features/frontdesk/types';

export function formatPatientAddressForReport(
  address: VisitRegistrationAddressBlock | undefined,
): string | undefined {
  if (!address) return undefined;
  const parts = [
    address.line1,
    address.line2,
    address.city,
    address.district,
    address.state,
    address.pincode,
  ]
    .map((part) => part?.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : undefined;
}
