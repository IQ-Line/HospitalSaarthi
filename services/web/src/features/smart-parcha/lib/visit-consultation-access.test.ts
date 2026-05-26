import { describe, expect, it } from 'vitest';
import { resolveConsultationAccess } from './visit-consultation-access';
import type { VisitSummary } from '../types';

describe('resolveConsultationAccess', () => {
  it('allows edit for in-progress visit', () => {
    const v: VisitSummary = { _id: '1', patient: 'p', status: 'in-progress' };
    expect(resolveConsultationAccess(v)).toMatchObject({
      editable: true,
      isReadOnly: false,
    });
  });

  it('locks prior-day completed visit', () => {
    const v: VisitSummary = {
      _id: '1',
      patient: 'p',
      status: 'consulted',
      completedAt: '2020-01-01T10:00:00.000Z',
    };
    expect(resolveConsultationAccess(v)).toMatchObject({
      editable: false,
      isReadOnly: true,
    });
  });
});
