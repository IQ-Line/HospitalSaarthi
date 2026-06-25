import { describe, expect, it } from 'vitest';
import {
  generateRecordCaption,
  recordDisplayType,
  transformFhirBundleForView,
} from './fhir-bundle-view';

const sampleBundle = JSON.stringify({
  resourceType: 'Bundle',
  type: 'document',
  id: 'bundle-1',
  entry: [
    {
      fullUrl: 'Composition/comp-1',
      resource: {
        resourceType: 'Composition',
        id: 'comp-1',
        status: 'final',
        title: 'Consultation Report',
        date: '2026-06-07T10:00:00+05:30',
        meta: {
          profile: [
            'https://nrces.in/ndhm/fhir/r4/StructureDefinition/OPConsultRecord|6.5.0',
          ],
        },
        custodian: { reference: 'Organization/org-1' },
      },
    },
    {
      fullUrl: 'Organization/org-1',
      resource: {
        resourceType: 'Organization',
        id: 'org-1',
        name: 'GOVERNMENT INSTITUTE OF MEDICAL SCIENCES, GREATER NOIDA',
      },
    },
    {
      fullUrl: 'Patient/pat-1',
      resource: {
        resourceType: 'Patient',
        id: 'pat-1',
        name: [{ text: 'Savitri Devi', use: 'official' }],
        gender: 'female',
        birthDate: '1990-01-15',
        telecom: [{ value: '9876543210', use: 'mobile' }],
        identifier: [{ value: 'PAT-001' }],
      },
    },
    {
      fullUrl: 'Practitioner/prac-1',
      resource: {
        resourceType: 'Practitioner',
        id: 'prac-1',
        name: [{ text: 'Dr. Practitioner', use: 'official' }],
      },
    },
    {
      fullUrl: 'Encounter/enc-1',
      resource: {
        resourceType: 'Encounter',
        id: 'enc-1',
        status: 'finished',
        class: { code: 'AMB', display: 'ambulatory' },
        type: [{ text: 'Outpatient' }],
        period: { start: '2026-06-07T09:00:00+05:30', end: '2026-06-07T10:00:00+05:30' },
        identifier: [{ value: 'ENC-001' }],
      },
    },
  ],
});

describe('transformFhirBundleForView', () => {
  it('parses FHIR bundle into legacy view sections', () => {
    const view = transformFhirBundleForView(sampleBundle, { id: 'bundle-1', content: sampleBundle });

    expect(view.bundleType).toBe('OPConsultRecord');
    expect(view.CompositionInfo?.[0]?.title).toBe('Consultation Report');
    expect((view.CompositionInfo?.[0]?.custodian as { display?: string })?.display).toContain(
      'GOVERNMENT INSTITUTE',
    );
    expect(view.PatientInfo?.[0]?.name).toBe('Savitri Devi');
    expect(view.PractitionerInfo?.[0]?.name).toBe('Dr. Practitioner');
    expect(view.EncounterInfo?.[0]?.status).toBe('finished');
    expect(generateRecordCaption(view)).toMatch(/Visit date on/);
    expect(recordDisplayType({ id: 'bundle-1', content: sampleBundle }, view)).toBe(
      'Consultation Report',
    );
  });

  it('returns a safe fallback when bundle JSON is malformed', () => {
    const view = transformFhirBundleForView('not-json', {
      id: 'care-ref-1',
      content: 'not-json',
      careContextReference: 'care-ref-1',
      bundleType: 'OPConsultRecord',
      CompositionInfo: [{ title: 'Consultation Notes' }],
    });

    expect(view.id).toBe('care-ref-1');
    expect(view.bundleType).toBe('OPConsultRecord');
    expect(view.CompositionInfo?.[0]?.title).toBe('Consultation Notes');
    expect(view.PatientInfo).toBeUndefined();
    expect(recordDisplayType({ id: 'care-ref-1', content: 'not-json', bundleType: 'OPConsultRecord' }, view)).toBe(
      'Consultation Notes',
    );
  });
});
