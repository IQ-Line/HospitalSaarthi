import { useEffect, useMemo, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@pulse/ui/select';
import { Label } from '@pulse/ui/label';
import { useConfiguratorOrgTenantCatalog } from '../api/catalog';

type OrgTenantPickerProps = {
  organizationId: string;
  tenantId: string;
  onOrganizationChange: (orgId: string) => void;
  onTenantChange: (tenantId: string, tenantName: string) => void;
  organizationLabel?: string;
  tenantLabel?: string;
  disabled?: boolean;
};

/**
 * Two-step picker: organization → tenant (Configurator catalog).
 */
export function OrgTenantPicker({
  organizationId,
  tenantId,
  onOrganizationChange,
  onTenantChange,
  organizationLabel = 'Organization',
  tenantLabel = 'Hospital tenant',
  disabled = false,
}: OrgTenantPickerProps) {
  const catalogQuery = useConfiguratorOrgTenantCatalog();
  const organizations = catalogQuery.data?.organizations ?? [];
  const tenantsByOrgId = catalogQuery.data?.tenantsByOrgId;

  const [selectedOrgId, setSelectedOrgId] = useState(organizationId);

  useEffect(() => {
    if (organizationId && organizationId !== selectedOrgId) {
      setSelectedOrgId(organizationId);
    }
  }, [organizationId, selectedOrgId]);

  useEffect(() => {
    if (selectedOrgId || !tenantId || !tenantsByOrgId) {
      return;
    }
    for (const [orgId, tenants] of tenantsByOrgId) {
      if (tenants.some((t) => t.iq_tenant_id === tenantId)) {
        setSelectedOrgId(orgId);
        onOrganizationChange(orgId);
        return;
      }
    }
  }, [selectedOrgId, tenantId, tenantsByOrgId, onOrganizationChange]);

  const tenantsForOrg = useMemo(() => {
    if (!selectedOrgId || !tenantsByOrgId) {
      return [];
    }
    return tenantsByOrgId.get(selectedOrgId) ?? [];
  }, [selectedOrgId, tenantsByOrgId]);

  useEffect(() => {
    if (catalogQuery.isPending || organizations.length === 0) {
      return;
    }
    if (selectedOrgId) {
      return;
    }
    const firstOrg = organizations[0];
    if (firstOrg) {
      setSelectedOrgId(firstOrg.id);
      onOrganizationChange(firstOrg.id);
    }
  }, [catalogQuery.isPending, organizations, selectedOrgId, onOrganizationChange]);

  // Only pick a default tenant when none is selected. Never displace a controlled
  // tenantId that is temporarily missing from the org list (e.g. Onboarding detail
  // switched the active facility while the header picker org is still settling) —
  // that fight causes "Maximum update depth exceeded".
  useEffect(() => {
    if (tenantsForOrg.length === 0 || tenantId.trim() !== '') {
      return;
    }
    const first = tenantsForOrg[0];
    if (first) {
      onTenantChange(first.iq_tenant_id, first.name);
    }
  }, [tenantsForOrg, tenantId, onTenantChange]);

  const handleOrgChange = (orgId: string) => {
    setSelectedOrgId(orgId);
    onOrganizationChange(orgId);
    const tenants = tenantsByOrgId?.get(orgId) ?? [];
    const first = tenants[0];
    if (first) {
      onTenantChange(first.iq_tenant_id, first.name);
    }
  };

  return (
    <OrgTenantPickerFields
      organizationLabel={organizationLabel}
      tenantLabel={tenantLabel}
      disabled={disabled || catalogQuery.isPending}
      organizations={organizations}
      tenantsForOrg={tenantsForOrg}
      selectedOrgId={selectedOrgId}
      tenantId={tenantId}
      onOrgChange={handleOrgChange}
      onTenantChange={onTenantChange}
      isLoading={catalogQuery.isPending}
    />
  );
}

function OrgTenantPickerFields({
  organizationLabel,
  tenantLabel,
  disabled,
  organizations,
  tenantsForOrg,
  selectedOrgId,
  tenantId,
  onOrgChange,
  onTenantChange,
  isLoading,
}: {
  organizationLabel: string;
  tenantLabel: string;
  disabled: boolean;
  organizations: Array<{ id: string; name: string }>;
  tenantsForOrg: Array<{ iq_tenant_id: string; name: string; slug: string }>;
  selectedOrgId: string;
  tenantId: string;
  onOrgChange: (orgId: string) => void;
  onTenantChange: (tenantId: string, tenantName: string) => void;
  isLoading: boolean;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <PickerField
        label={organizationLabel}
        value={selectedOrgId}
        onChange={onOrgChange}
        disabled={disabled}
        placeholder={isLoading ? 'Loading...' : 'Select organization'}
        items={organizations.map((org) => ({ value: org.id, label: org.name }))}
      />
      <PickerField
        label={tenantLabel}
        value={tenantId}
        onChange={(id) => {
          const row = tenantsForOrg.find((t) => t.iq_tenant_id === id);
          onTenantChange(id, row?.name ?? row?.slug ?? id);
        }}
        disabled={disabled || !selectedOrgId || tenantsForOrg.length === 0}
        placeholder={
          !selectedOrgId
            ? 'Pick an organization first'
            : tenantsForOrg.length === 0
              ? 'No tenants'
              : 'Select tenant'
        }
        items={tenantsForOrg.map((t) => ({ value: t.iq_tenant_id, label: t.name }))}
      />
    </div>
  );
}

function PickerField({
  label,
  value,
  onChange,
  disabled,
  placeholder,
  items,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  placeholder: string;
  items: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
