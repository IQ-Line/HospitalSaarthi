import { describe, expect, it } from 'vitest';
import { effectiveOpdQueueStatus, queueStatusLabel } from './registration-visit-status';

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

  it('maps in_progress registration to registered queue when consultation not started', () => {
    expect(effectiveOpdQueueStatus('in_progress', null)).toBe('registered');
  });

  it('shows pre-consulted when nurse completed OPD pre-consult overlay', () => {
    expect(effectiveOpdQueueStatus('completed', 'draft', 'pre_consulted')).toBe('pre-consulted');
    expect(effectiveOpdQueueStatus('pending', 'draft', 'pre_consulted')).toBe('pre-consulted');
  });

  it('shows pre-consulted when doctor has saved partial consultation on OPD visit', () => {
    expect(effectiveOpdQueueStatus('pending', 'draft', 'in_progress')).toBe('pre-consulted');
    expect(effectiveOpdQueueStatus('completed', 'draft', 'in_progress')).toBe('pre-consulted');
  });

  it('stays registered for auto-created draft before nurse or doctor acts', () => {
    expect(effectiveOpdQueueStatus('completed', 'draft', 'registered')).toBe('registered');
  });
});

describe('queueStatusLabel', () => {
  it('maps queue statuses to frontdesk-friendly labels', () => {
    expect(queueStatusLabel('registered')).toBe('Registered');
    expect(queueStatusLabel('pre-consulted')).toBe('Pre-consultation');
    expect(queueStatusLabel('completed')).toBe('Consulted');
  });
});
