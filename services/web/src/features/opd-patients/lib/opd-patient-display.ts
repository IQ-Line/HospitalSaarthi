import type { OpdVisitStatus } from '../types';

export function formatOpdVisitCreated(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return isoDate;
  const day = date.getDate().toString().padStart(2, '0');
  const month = date.toLocaleString('en-US', { month: 'short' });
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

export function formatPatientNameWithDemographics(
  name: string,
  age: number,
  gender: string,
): string {
  const g = gender?.charAt(0).toUpperCase() ?? '';
  return `${name} (${age}, ${g})`;
}

export function opdStatusLabel(status: OpdVisitStatus): string {
  switch (status) {
    case 'registered':
      return 'Registered';
    case 'in-progress':
      return 'In-Progress';
    case 'completed':
      return 'Consulted';
    case 'cancelled':
      return 'Cancelled';
    default:
      return status;
  }
}

export function opdStatusBadgeClass(status: OpdVisitStatus): string {
  switch (status) {
    case 'registered':
      return 'bg-cyan-100 text-cyan-950';
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'in-progress':
      return 'bg-[#f6f591] text-[#737720]';
    case 'cancelled':
      return 'bg-slate-100 text-slate-600';
    default:
      return 'bg-muted text-muted-foreground';
  }
}
