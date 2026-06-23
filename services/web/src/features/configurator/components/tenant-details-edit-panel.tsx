import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@pulse/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@pulse/ui/card';
import { Input } from '@pulse/ui/input';
import { Label } from '@pulse/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@pulse/ui/select';
import { useOrganization, useTenant, useUpdateOrganization, useUpdateTenant } from '@/features/configurator/api';
import {
  parseBrandingLogoMetadata,
  uploadOrganizationBrandingLogo,
  uploadTenantBrandingLogo,
} from '@/features/configurator/api/branding-logos';
import { BrandingLogoImage } from '@/features/configurator/components/branding-logo-image';
import { IndianPincodeAddressFields } from '@/features/configurator/components/indian-pincode-address-fields';
import { LogoUploadField } from '@/features/configurator/components/logo-upload-field';
import type {
  ConfiguratorBranchType,
  ConfiguratorTenant,
  Organization,
  OrganizationType,
  OrganizationUpdateInput,
} from '@/features/configurator/types';
import { organizationTypeOptions } from '@/features/configurator/validation';
import type { BrandingLogoMetadata } from '@/features/configurator/api/branding-logos';

type AddressDetail = {
  hq_line1?: string | null;
  locality?: string | null;
  block?: string | null;
  district?: string | null;
  state?: string | null;
  pin_code?: string | null;
};

type DetailsFormState = {
  name: string;
  contactEmail: string;
  contactPhone: string;
  branchType: ConfiguratorBranchType | '';
  addressLine1: string;
  locality: string;
  block: string;
  city: string;
  state: string;
  pinCode: string;
  gstin: string;
  pan: string;
};

type OrganisationFormState = {
  name: string;
  type: OrganizationType;
  contactEmail: string;
  contactPhone: string;
  website: string;
  address: string;
};

const BRANCH_TYPE_OPTIONS: Array<{ value: ConfiguratorBranchType; label: string }> = [
  { value: 'hub_lab', label: 'Hub Lab' },
  { value: 'hub', label: 'Hub' },
  { value: 'satellite', label: 'Satellite' },
];

function readAddressDetail(metadata: Record<string, unknown> | null): AddressDetail {
  const detail = metadata?.address_detail;
  if (!detail || typeof detail !== 'object') return {};
  return detail as AddressDetail;
}

function tenantToFormState(tenant: ConfiguratorTenant): DetailsFormState {
  const detail = readAddressDetail(tenant.metadata);
  const meta = tenant.metadata ?? {};

  return {
    name: tenant.name ?? '',
    contactEmail: tenant.contact_email?.trim() ?? '',
    contactPhone: tenant.contact_phone?.trim() ?? '',
    branchType: tenant.branch_type ?? (tenant.parent_tenant_id ? 'satellite' : ''),
    addressLine1: tenant.address_line1?.trim() ?? detail.hq_line1?.trim() ?? '',
    locality: detail.locality?.trim() ?? '',
    block: detail.block?.trim() ?? '',
    city: tenant.city?.trim() ?? detail.district?.trim() ?? '',
    state: tenant.state?.trim() ?? detail.state?.trim() ?? '',
    pinCode: tenant.pin_code?.trim() ?? detail.pin_code?.trim() ?? '',
    gstin: typeof meta.gstin === 'string' ? meta.gstin.trim() : '',
    pan: typeof meta.pan === 'string' ? meta.pan.trim() : '',
  };
}

function organisationToFormState(org: {
  name: string;
  type: OrganizationType;
  contact_email: string | null;
  contact_phone: string | null;
  website: string | null;
  address: string | null;
}): OrganisationFormState {
  return {
    name: org.name ?? '',
    type: org.type,
    contactEmail: org.contact_email?.trim() ?? '',
    contactPhone: org.contact_phone?.trim() ?? '',
    website: org.website?.trim() ?? '',
    address: org.address?.trim() ?? '',
  };
}

function buildMergedMetadata(
  existing: Record<string, unknown> | null,
  form: Pick<
    DetailsFormState,
    'gstin' | 'pan' | 'addressLine1' | 'locality' | 'block' | 'city' | 'state' | 'pinCode'
  >,
): Record<string, unknown> {
  const base = { ...(existing ?? {}) };

  const gstin = form.gstin.trim().toUpperCase();
  const pan = form.pan.trim().toUpperCase();
  const addressLine1 = form.addressLine1.trim();
  const locality = form.locality.trim();
  const block = form.block.trim();
  const city = form.city.trim();
  const state = form.state.trim();
  const pinCode = form.pinCode.trim();

  base.gstin = gstin || null;
  base.pan = pan || null;

  const addressDetail: AddressDetail = {
    hq_line1: addressLine1 || null,
    locality: locality || null,
    block: block || null,
    district: city || null,
    state: state || null,
    pin_code: pinCode || null,
  };
  base.address_detail = addressDetail;

  const addressParts = [addressLine1, locality, block, city, state, pinCode].filter(Boolean);
  if (addressParts.length > 0) {
    base.address = addressParts.join(', ');
  }

  return base;
}

function validateTenantForm(
  form: DetailsFormState,
  isBranch: boolean,
): string | null {
  if (!form.name.trim()) {
    return isBranch ? 'Branch name is required' : 'Display name is required';
  }
  const email = form.contactEmail.trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'Enter a valid contact email';
  }
  const pin = form.pinCode.trim();
  if (pin && !/^[0-9]{6}$/.test(pin)) {
    return 'PIN code must be 6 digits';
  }
  const gstin = form.gstin.trim().toUpperCase();
  if (gstin && gstin.length !== 15) {
    return 'GSTIN must be 15 characters';
  }
  const pan = form.pan.trim().toUpperCase();
  if (pan && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) {
    return 'Invalid PAN format (e.g. ABCDE1234F)';
  }
  if (isBranch && !form.branchType) {
    return 'Branch type is required';
  }
  return null;
}

function validateOrganisationForm(form: OrganisationFormState): string | null {
  if (!form.name.trim()) {
    return 'Organisation name is required';
  }
  const email = form.contactEmail.trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'Enter a valid organisation email';
  }
  const website = form.website.trim();
  if (website && !/^https?:\/\//i.test(website)) {
    return 'Website must start with http:// or https://';
  }
  return null;
}

/**
 * Persists the organisation form (and its optional logo) via the update mutation.
 * Extracted from the component so the save handler stays under the cognitive-complexity budget.
 */
async function saveOrganisationDetails(args: {
  organisation: Organization;
  orgForm: OrganisationFormState;
  orgLogoFile: File | null;
  mutateAsync: (vars: { id: string; input: OrganizationUpdateInput }) => Promise<Organization>;
}): Promise<void> {
  const { organisation, orgForm, orgLogoFile, mutateAsync } = args;

  let orgMetadata = { ...(organisation.metadata ?? {}) };
  if (orgLogoFile) {
    const logo = await uploadOrganizationBrandingLogo(organisation.slug, orgLogoFile);
    orgMetadata = { ...orgMetadata, logo };
  }

  await mutateAsync({
    id: organisation.id,
    input: {
      name: orgForm.name.trim(),
      type: orgForm.type,
      contact_email: orgForm.contactEmail.trim() || null,
      contact_phone: orgForm.contactPhone.trim() || null,
      website: orgForm.website.trim() || null,
      address: orgForm.address.trim() || null,
      metadata: orgMetadata,
    },
  });
}

/**
 * Renders the "current logo" preview row shown above a {@link LogoUploadField}.
 * Returns null when a replacement file is staged or no stored logo exists — preserving
 * the original `{!file && logo ? (<div…/>) : null}` render branch.
 */
function CurrentLogoPreview({
  file,
  logo,
  alt,
  caption,
}: {
  file: File | null;
  logo: BrandingLogoMetadata | null;
  alt: string;
  caption: string;
}) {
  if (file || !logo) return null;
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
      <BrandingLogoImage
        logo={logo}
        alt={alt}
        className="size-16 border bg-background p-1"
        showFallbackIcon={false}
      />
      <p className="text-sm text-muted-foreground">{caption}</p>
    </div>
  );
}

/** Organisation fields + logo block, shown only when editing a tenant (not a branch). */
function OrganisationSection({
  organisation,
  orgForm,
  setOrgField,
  currentOrgLogo,
  orgLogoFile,
  setOrgLogoFile,
  isSaving,
}: {
  organisation: Organization;
  orgForm: OrganisationFormState;
  setOrgField: <K extends keyof OrganisationFormState>(
    field: K,
    value: OrganisationFormState[K],
  ) => void;
  currentOrgLogo: BrandingLogoMetadata | null;
  orgLogoFile: File | null;
  setOrgLogoFile: (file: File | null) => void;
  isSaving: boolean;
}) {
  return (
    <section className="space-y-4">
      <h3 className="text-sm font-medium">Organisation</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="org-details-name">Organisation name</Label>
          <Input
            id="org-details-name"
            value={orgForm.name}
            onChange={(e) => setOrgField('name', e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="org-details-type">Organisation type</Label>
          <Select
            value={orgForm.type}
            onValueChange={(v) => setOrgField('type', v as OrganizationType)}
          >
            <SelectTrigger id="org-details-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {organizationTypeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="org-details-email">Organisation email</Label>
          <Input
            id="org-details-email"
            type="email"
            value={orgForm.contactEmail}
            onChange={(e) => setOrgField('contactEmail', e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="org-details-phone">Organisation phone</Label>
          <Input
            id="org-details-phone"
            value={orgForm.contactPhone}
            onChange={(e) => setOrgField('contactPhone', e.target.value)}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="org-details-website">Website (optional)</Label>
          <Input
            id="org-details-website"
            type="url"
            placeholder="https://"
            value={orgForm.website}
            onChange={(e) => setOrgField('website', e.target.value)}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="org-details-address">Organisation address (optional)</Label>
          <Input
            id="org-details-address"
            value={orgForm.address}
            onChange={(e) => setOrgField('address', e.target.value)}
          />
        </div>
      </div>
      <div className="space-y-3 pt-2">
        <h4 className="text-sm font-medium text-muted-foreground">Organisation logo</h4>
        <CurrentLogoPreview
          file={orgLogoFile}
          logo={currentOrgLogo}
          alt={`${organisation.name} logo`}
          caption="Current organisation logo"
        />
        <LogoUploadField
          id="org-details-logo"
          label={currentOrgLogo ? 'Replace organisation logo' : 'Organisation logo (optional)'}
          description="PNG or JPEG, up to 2 MB. Saved when you click Save changes."
          file={orgLogoFile}
          onFileChange={setOrgLogoFile}
          disabled={isSaving}
        />
      </div>
    </section>
  );
}

export function TenantDetailsEditPanel({
  iqTenantId,
  showOrganisationFields = false,
}: {
  iqTenantId: string;
  showOrganisationFields?: boolean;
}) {
  const { data: tenant, isLoading } = useTenant(iqTenantId);
  const isBranch = !showOrganisationFields;
  const { data: organisation, isLoading: orgLoading } = useOrganization(tenant?.org_id ?? '', {
    enabled: showOrganisationFields,
  });
  const updateMutation = useUpdateTenant(iqTenantId);
  const updateOrganisationMutation = useUpdateOrganization();
  const [isSaving, setIsSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [orgLogoFile, setOrgLogoFile] = useState<File | null>(null);
  const [initialPinCode, setInitialPinCode] = useState('');
  const [form, setForm] = useState<DetailsFormState>(() => ({
    name: '',
    contactEmail: '',
    contactPhone: '',
    branchType: '',
    addressLine1: '',
    locality: '',
    block: '',
    city: '',
    state: '',
    pinCode: '',
    gstin: '',
    pan: '',
  }));
  const [orgForm, setOrgForm] = useState<OrganisationFormState>(() => ({
    name: '',
    type: 'standalone_hospital',
    contactEmail: '',
    contactPhone: '',
    website: '',
    address: '',
  }));

  const currentLogo = useMemo(
    () => parseBrandingLogoMetadata(tenant?.metadata ?? null),
    [tenant?.metadata],
  );
  const currentOrgLogo = useMemo(
    () => parseBrandingLogoMetadata(organisation?.metadata ?? null),
    [organisation?.metadata],
  );

  useEffect(() => {
    if (!tenant) return;
    const nextForm = tenantToFormState(tenant);
    setForm(nextForm);
    setInitialPinCode(nextForm.pinCode);
    setLogoFile(null);
  }, [tenant]);

  useEffect(() => {
    if (!organisation) return;
    setOrgForm(organisationToFormState(organisation));
    setOrgLogoFile(null);
  }, [organisation]);

  const setField = <K extends keyof DetailsFormState>(field: K, value: DetailsFormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const setOrgField = <K extends keyof OrganisationFormState>(
    field: K,
    value: OrganisationFormState[K],
  ) => {
    setOrgForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!tenant) return;

    const tenantError = validateTenantForm(form, isBranch);
    if (tenantError) {
      toast.error(tenantError);
      return;
    }
    if (showOrganisationFields && organisation) {
      const orgError = validateOrganisationForm(orgForm);
      if (orgError) {
        toast.error(orgError);
        return;
      }
    }

    const addressLine1 = form.addressLine1.trim();
    const city = form.city.trim();
    const state = form.state.trim();
    const pinCode = form.pinCode.trim();

    setIsSaving(true);
    try {
      let metadata = buildMergedMetadata(tenant.metadata, form);
      if (logoFile) {
        const logo = await uploadTenantBrandingLogo(tenant.slug, logoFile);
        metadata = { ...metadata, logo };
      }

      await updateMutation.mutateAsync({
        name: form.name.trim(),
        contact_email: form.contactEmail.trim(),
        contact_phone: form.contactPhone.trim(),
        address_line1: addressLine1,
        city: city,
        state: state,
        pin_code: pinCode,
        metadata,
        ...(isBranch && form.branchType ? { branch_type: form.branchType } : {}),
      });

      if (showOrganisationFields && organisation) {
        await saveOrganisationDetails({
          organisation,
          orgForm,
          orgLogoFile,
          mutateAsync: updateOrganisationMutation.mutateAsync,
        });
        setOrgLogoFile(null);
      }

      setLogoFile(null);
      toast.success('Details saved');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save details';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  if ((isLoading && !tenant) || (showOrganisationFields && orgLoading && !organisation)) {
    return <p className="text-sm text-muted-foreground">Loading details…</p>;
  }

  if (!tenant) {
    return <p className="text-sm text-muted-foreground">Tenant not found.</p>;
  }

  return (
    <div className="w-full space-y-4">
      <Card className="shadow-sm">
        <CardHeader className="flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base">
              {isBranch ? 'Branch details' : 'Tenant details'}
            </CardTitle>
            <CardDescription>
              {showOrganisationFields
                ? 'Update tenant and organisation information collected during onboarding.'
                : 'Update branch information collected during onboarding.'}
            </CardDescription>
          </div>
          <Button
            type="button"
            className="shrink-0 bg-[#008C9E] text-white hover:bg-[#00798a]"
            onClick={() => void handleSave()}
            disabled={isSaving}
          >
            {isSaving ? 'Saving…' : 'Save changes'}
          </Button>
        </CardHeader>
        <CardContent className="space-y-8 pt-6">
          {showOrganisationFields && organisation ? (
            <OrganisationSection
              organisation={organisation}
              orgForm={orgForm}
              setOrgField={setOrgField}
              currentOrgLogo={currentOrgLogo}
              orgLogoFile={orgLogoFile}
              setOrgLogoFile={setOrgLogoFile}
              isSaving={isSaving}
            />
          ) : null}

          <section className="space-y-4">
            <h3 className="text-sm font-medium">{isBranch ? 'Branch' : 'Tenant'}</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="tenant-details-name">
                  {isBranch ? 'Branch name' : 'Display name'}
                </Label>
                <Input
                  id="tenant-details-name"
                  value={form.name}
                  onChange={(e) => setField('name', e.target.value)}
                />
              </div>
              {isBranch ? (
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="tenant-details-branch-type">Branch type</Label>
                  <Select
                    value={form.branchType || undefined}
                    onValueChange={(v) => setField('branchType', v as ConfiguratorBranchType)}
                  >
                    <SelectTrigger id="tenant-details-branch-type">
                      <SelectValue placeholder="Select branch type" />
                    </SelectTrigger>
                    <SelectContent>
                      {BRANCH_TYPE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
              <div className="space-y-1.5">
                <Label htmlFor="tenant-details-email">Contact email</Label>
                <Input
                  id="tenant-details-email"
                  type="email"
                  value={form.contactEmail}
                  onChange={(e) => setField('contactEmail', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tenant-details-phone">Contact phone</Label>
                <Input
                  id="tenant-details-phone"
                  value={form.contactPhone}
                  onChange={(e) => setField('contactPhone', e.target.value)}
                />
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-sm font-medium">{isBranch ? 'Branch logo' : 'Tenant logo'}</h3>
            <CurrentLogoPreview
              file={logoFile}
              logo={currentLogo}
              alt={`${tenant.name} logo`}
              caption={`Current ${isBranch ? 'branch' : 'tenant'} logo`}
            />
            <LogoUploadField
              id="tenant-details-logo"
              label={currentLogo ? 'Replace logo' : 'Logo (optional)'}
              description="PNG or JPEG, up to 2 MB. Saved when you click Save changes."
              file={logoFile}
              onFileChange={setLogoFile}
              disabled={isSaving}
            />
          </section>

          <section className="space-y-4">
            <h3 className="text-sm font-medium">Address</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="tenant-details-address">Address line 1</Label>
                <Input
                  id="tenant-details-address"
                  value={form.addressLine1}
                  onChange={(e) => setField('addressLine1', e.target.value)}
                />
              </div>
              <IndianPincodeAddressFields
                idPrefix="tenant-details"
                values={{
                  pinCode: form.pinCode,
                  locality: form.locality,
                  block: form.block,
                  district: form.city,
                  state: form.state,
                }}
                initialPinCode={initialPinCode}
                districtLabel="City / district"
                onFieldChange={(field, value) => {
                  if (field === 'district') {
                    setField('city', value);
                    return;
                  }
                  setField(field, value);
                }}
              />
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-sm font-medium">Tax identifiers</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="tenant-details-gstin">GSTIN (optional)</Label>
                <Input
                  id="tenant-details-gstin"
                  value={form.gstin}
                  onChange={(e) => setField('gstin', e.target.value.toUpperCase())}
                  maxLength={15}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tenant-details-pan">PAN (optional)</Label>
                <Input
                  id="tenant-details-pan"
                  value={form.pan}
                  onChange={(e) => setField('pan', e.target.value.toUpperCase())}
                  maxLength={10}
                />
              </div>
            </div>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
