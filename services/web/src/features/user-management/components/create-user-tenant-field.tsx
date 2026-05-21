import { OrgTenantPicker } from '@/features/configurator/components/org-tenant-picker';
import { UserManagementSectionCard } from './user-management-section-card';

type CreateUserTenantFieldProps = {
  tenantId: string;
  onTenantChange: (tenantId: string) => void;
  onOrganizationChange: (orgId: string) => void;
};

/**
 * Platform super-admin only: organization and hospital tenant from Configurator catalog.
 * Tenant admins never see this — their session tenant is used automatically.
 */
export function CreateUserTenantField({
  tenantId,
  onTenantChange,
  onOrganizationChange,
}: CreateUserTenantFieldProps) {
  return (
    <UserManagementSectionCard
      title="Organization & hospital"
      description="Select from the Configurator catalog. Only platform administrators can assign a different hospital."
      contentClassName="space-y-2"
    >
      <OrgTenantPicker
        organizationId=""
        tenantId={tenantId}
        onOrganizationChange={onOrganizationChange}
        onTenantChange={(id) => onTenantChange(id)}
      />
    </UserManagementSectionCard>
  );
}
