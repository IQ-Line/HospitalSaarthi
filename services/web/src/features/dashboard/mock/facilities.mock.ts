import type { DashboardFacility } from '../types';

/** Mock facilities until a dedicated facility master API ships. */
export const MOCK_DASHBOARD_FACILITIES: DashboardFacility[] = [
  {
    tenantId: '00000000-0000-4000-8000-000000000001',
    facilityId: 'IN0910033222',
    name: 'Integrator Testing Lab',
  },
  {
    tenantId: '00000000-0000-4000-8000-000000000002',
    facilityId: 'FAC001',
    name: 'CHC Mohanlalganj',
  },
  {
    tenantId: '00000000-0000-4000-8000-000000000003',
    facilityId: 'FAC002',
    name: 'District Hospital Lucknow',
  },
];
