import { describe, expect, it } from 'vitest';
import {
  resolveMedicationFrequencyLabel,
  resolveMedicationRouteLabel,
  resolveMedicationToaLabel,
} from './medication-rx-options';

describe('medication-rx-options', () => {
  it('maps catalog route codes to screenshot labels', () => {
    expect(resolveMedicationRouteLabel('oral')).toBe('Oral');
    expect(resolveMedicationRouteLabel('iv')).toBe('IV');
    expect(resolveMedicationRouteLabel('im')).toBe('IM');
  });

  it('maps catalog frequency codes to screenshot labels', () => {
    expect(resolveMedicationFrequencyLabel('bid')).toBe('Twice Daily');
    expect(resolveMedicationFrequencyLabel('tid')).toBe('Thrice Daily');
    expect(resolveMedicationFrequencyLabel('od')).toBe('Once Daily');
  });

  it('normalizes TOA instructions to screenshot labels', () => {
    expect(resolveMedicationToaLabel('after meals')).toBe('After Meals');
    expect(resolveMedicationToaLabel('Empty Stomach')).toBe('Empty Stomach');
  });
});
