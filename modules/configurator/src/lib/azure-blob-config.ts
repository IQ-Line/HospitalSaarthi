/** Azure Blob Storage settings (same env vars as OPD patient documents). */

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
      process.env["AZURE_BLOB_CONTAINER"]?.trim() || "hmis-patient-docs",
  };
}
