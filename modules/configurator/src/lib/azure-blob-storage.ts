import {
  BlobServiceClient,
  type BlockBlobUploadOptions,
} from "@azure/storage-blob";
import { getAzureBlobSettings } from "./azure-blob-config.js";
import {
  extensionForMimeType,
  generateBrandingLogoPath,
  sanitizeFilename,
} from "./logo-upload-validation.js";

export interface BlobUploadResult {
  blobUrl: string;
  storageKey: string;
}

let blobServiceClient: BlobServiceClient | null = null;

function getBlobServiceClient(): BlobServiceClient {
  if (blobServiceClient) {
    return blobServiceClient;
  }
  const settings = getAzureBlobSettings();
  if (!settings.connectionString) {
    throw new Error("Azure Storage connection string is not configured");
  }
  blobServiceClient = BlobServiceClient.fromConnectionString(settings.connectionString);
  return blobServiceClient;
}

export async function uploadBrandingLogoBlob(
  fileBytes: Buffer,
  originalFileName: string,
  mimeType: string,
  scope: "organization" | "tenant",
  slug: string,
): Promise<BlobUploadResult> {
  const settings = getAzureBlobSettings();
  if (!settings.connectionString) {
    throw new Error("Azure Storage connection string is not configured");
  }

  const client = getBlobServiceClient();
  const containerClient = client.getContainerClient(settings.containerName);
  await containerClient.createIfNotExists();

  const sanitizedName = sanitizeFilename(originalFileName);
  const extension =
    sanitizedName.includes(".")
      ? sanitizedName.split(".").pop() ?? ""
      : extensionForMimeType(mimeType);
  const storageKey = generateBrandingLogoPath(scope, slug, extension ? `.${extension}` : "");

  const blobClient = containerClient.getBlockBlobClient(storageKey);
  const uploadOptions: BlockBlobUploadOptions = {
    blobHTTPHeaders: {
      blobContentType: mimeType,
      blobCacheControl: "no-cache",
      blobContentDisposition: "inline",
    },
    metadata: {
      originalFileName: sanitizedName,
      uploadedAt: new Date().toISOString(),
      securityValidated: "true",
      brandingScope: scope,
    },
  };

  await blobClient.upload(fileBytes, fileBytes.length, uploadOptions);
  return {
    blobUrl: blobClient.url,
    storageKey,
  };
}

export async function downloadBrandingLogoBytes(
  storageKey: string,
): Promise<{ bytes: Buffer; contentType: string }> {
  const settings = getAzureBlobSettings();
  if (!settings.connectionString) {
    throw new Error("Azure Storage connection string is not configured");
  }

  const blobClient = getBlobServiceClient()
    .getContainerClient(settings.containerName)
    .getBlockBlobClient(storageKey);

  try {
    const props = await blobClient.getProperties();
    const download = await blobClient.download();
    const chunks: Buffer[] = [];
    if (!download.readableStreamBody) {
      throw new Error(`Failed to download blob: ${storageKey}`);
    }
    for await (const chunk of download.readableStreamBody) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const contentType = props.contentType ?? "application/octet-stream";
    return { bytes: Buffer.concat(chunks), contentType };
  } catch (error) {
    throw new Error(
      `Failed to download blob: ${storageKey}`,
      error instanceof Error ? { cause: error } : undefined,
    );
  }
}

