import { describe, expect, it } from 'vitest';
import { opdVisitStatusToActionLabel } from '../../../../../src/features/opd-patients/lib/opd-visit-status';

describe('opdVisitStatusToActionLabel', () => {
  it('shows Create Rx for registered encounters including auto-created draft shells', () => {
    expect(opdVisitStatusToActionLabel('registered', 'draft', 'registered')).toBe('Create Rx');
    expect(opdVisitStatusToActionLabel('registered', 'draft', null)).toBe('Create Rx');
    expect(opdVisitStatusToActionLabel('pre-consulted', 'draft', 'registered')).toBe('Create Rx');
  });

  it('shows Edit RX after nurse pre-consult or doctor consultation starts', () => {
    expect(opdVisitStatusToActionLabel('pre-consulted', 'draft', 'pre_consulted')).toBe('Edit RX');
    expect(opdVisitStatusToActionLabel('pre-consulted', 'draft', 'in_progress')).toBe('Edit RX');
  });

  it('shows View RX for completed consultations', () => {
    expect(opdVisitStatusToActionLabel('completed', 'final', 'completed')).toBe('View RX');
  });
});
