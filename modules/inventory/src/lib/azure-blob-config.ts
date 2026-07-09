/** Azure Blob Storage settings (shared credentials with OPD / configurator). */

export interface AzureBlobSettings {
  connectionString: string;
  accountName: string;
  accountKey: string;
  containerName: string;
}

export function getAzureBlobSettings(): AzureBlobSettings {
  return {
    connectionString: process.env["AZURE_STORAGE_CONNECTION_STRING"]?.trim() ?? "",
    accountName: process.env["AZURE_STORAGE_ACCOUNT"]?.trim() ?? "",
    accountKey: process.env["AZURE_STORAGE_ACCOUNT_KEY"]?.trim() ?? "",
    containerName:
      process.env["AZURE_BLOB_CONTAINER_INVENTORY"]?.trim() || "hmis-inventory-docs",
  };
}

export function isAzureBlobStorageConfigured(): boolean {
  const settings = getAzureBlobSettings();
  return (
    settings.connectionString.length > 0 ||
    (settings.accountName.length > 0 && settings.accountKey.length > 0)
  );
}
