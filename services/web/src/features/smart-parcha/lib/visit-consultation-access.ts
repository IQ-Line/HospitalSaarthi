import { isSameISTCalendarDayAsNow } from './ist-calendar';
import type { VisitSummary } from '../types';

const ACTIVE = new Set(['in-progress', 'waiting', 'registered']);
const CLOSED = new Set(['completed', 'consulted']);

function norm(s: unknown): string {
  return String(s ?? '').trim().toLowerCase();
}

function isClosed(status: string): boolean {
  return CLOSED.has(status);
}

export function visitCompletedAt(visit: VisitSummary | null | undefined): Date | null {
  if (!visit) return null;
  if (visit.completedAt) {
    const d = new Date(visit.completedAt);
    if (!Number.isNaN(d.getTime())) return d;
  }
  if (isClosed(norm(visit.status)) && visit.createdAt) {
    const d = new Date(visit.createdAt);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
}

export function resolveConsultationAccess(
  visit: VisitSummary | null | undefined,
  flags?: { resumedSameDay?: boolean; isAddendum?: boolean },
): import('../types').ConsultationAccess {
  if (!visit?.status) {
    return { editable: false, addendum: false, isReadOnly: true };
  }
  const status = norm(visit.status);
  const at = visitCompletedAt(visit);
  const priorDayClosed =
    isClosed(status) && (!at || !isSameISTCalendarDayAsNow(at));
  const sameDayClosed = isClosed(status) && at != null && isSameISTCalendarDayAsNow(at);

  if (priorDayClosed) {
    return { editable: false, addendum: false, isReadOnly: true };
  }

  const addendum =
    Boolean(flags?.isAddendum) ||
    Boolean(flags?.resumedSameDay) ||
    sameDayClosed;

  const editable = addendum || ACTIVE.has(status);

  return {
    editable,
    addendum,
    isReadOnly: !editable,
  };
}
