import { describe, expect, it } from 'vitest';
import type { Organization } from '@/features/configurator/types';
import {
  filterOrganisationsForTenantWizard,
  orgIdsWithTenants,
  organisationEligibleForNewTenant,
} from '../../../../../../src/features/configurator/components/create-tenant-wizard/wizard-org-helpers';

const standaloneOrg: Organization = {
  id: 'org-standalone',
  name: 'Solo Hospital',
  slug: 'solo-hospital',
  type: 'standalone_hospital',
  status: 'active',
  contact_email: null,
  website: null,
  contact_phone: null,
  address: null,
  metadata: null,
  created_at: '',
  updated_at: '',
  created_by: null,
  updated_by: null,
};

const chainOrg: Organization = {
  ...standaloneOrg,
  id: 'org-chain',
  name: 'Chain Health',
  slug: 'chain-health',
  type: 'hospital_chain',
};

describe('orgIdsWithTenants', () => {
  it('collects unique organisation ids from tenants', () => {
    expect(
      orgIdsWithTenants([
        { org_id: 'org-a' },
        { org_id: 'org-b' },
        { org_id: 'org-a' },
      ]),
    ).toEqual(new Set(['org-a', 'org-b']));
  });
});

describe('organisationEligibleForNewTenant', () => {
  it('allows non-standalone organisations even when tenants exist', () => {
    expect(organisationEligibleForNewTenant(chainOrg, new Set(['org-chain']))).toBe(true);
  });

  it('blocks standalone organisations that already have a tenant', () => {
    expect(organisationEligibleForNewTenant(standaloneOrg, new Set(['org-standalone']))).toBe(
      false,
    );
  });

  it('allows standalone organisations with no tenant yet', () => {
    expect(organisationEligibleForNewTenant(standaloneOrg, new Set())).toBe(true);
  });
});

describe('filterOrganisationsForTenantWizard', () => {
  it('removes standalone orgs that already have tenants', () => {
    const filtered = filterOrganisationsForTenantWizard(
      [standaloneOrg, chainOrg],
      new Set(['org-standalone']),
    );
    expect(filtered).toEqual([chainOrg]);
  });
});
