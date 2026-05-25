export type MasterDataPermissionOption = {
  linkId: string;
  moduleSlug: string;
  moduleName: string;
  permissionSlug: string;
  permissionName: string;
  permissionAction: string;
  isDefault: boolean;
  runtimeCapabilityId: string | null;
  capabilityKey: string | null;
};
