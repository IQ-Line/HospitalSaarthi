/** Runtime capability keys granted on activate for each partner-exposed operation. */
const OPERATION_CAPABILITY_KEYS: Record<string, readonly string[]> = {
  "registration.listRegistrations": ["registration:registration:read"],
  "empi.getPatient": ["empi:patient:read"],
  "configurator.listTenants": ["tenants:tenants:read"],
  "configurator.listTenantModules": ["tenant-modules:tenant-modules:read"],
  "masterData.listModules": [],
};

export function capabilityKeysForOperations(operations: readonly string[]): string[] {
  const keys = new Set<string>();
  for (const operation of operations) {
    for (const key of OPERATION_CAPABILITY_KEYS[operation] ?? []) {
      keys.add(key);
    }
  }
  return [...keys];
}
