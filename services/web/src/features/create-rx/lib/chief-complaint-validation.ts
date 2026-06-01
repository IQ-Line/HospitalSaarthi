import type { ChiefComplaintRow } from '../types';

export function hasAtLeastOneChiefComplaint(complaints: ChiefComplaintRow[]): boolean {
  return complaints.some((row) => row.complaint.trim().length > 0);
}
