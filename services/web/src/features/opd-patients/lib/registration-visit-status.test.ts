import { describe, expect, it } from 'vitest';
import { effectiveOpdQueueStatus } from './registration-visit-status';

describe('effectiveOpdQueueStatus', () => {
  it('treats desk-completed visit without RX as registered', () => {
    expect(effectiveOpdQueueStatus('completed', null)).toBe('registered');
    expect(effectiveOpdQueueStatus('completed', undefined)).toBe('registered');
    expect(effectiveOpdQueueStatus('completed', 'draft')).toBe('registered');
  });

  it('shows consulted when prescription is final', () => {
    expect(effectiveOpdQueueStatus('completed', 'final')).toBe('completed');
    expect(effectiveOpdQueueStatus('in_progress', 'final')).toBe('completed');
  });

  it('maps in_progress registration to in-progress queue', () => {
    expect(effectiveOpdQueueStatus('in_progress', null)).toBe('in-progress');
  });
});
