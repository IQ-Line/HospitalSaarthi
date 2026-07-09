import { randomUUID } from "node:crypto";
import {
  BlobServiceClient,
  type BlockBlobUploadOptions,
  StorageSharedKeyCredential,
} from "@azure/storage-blob";
import { InventoryError } from "../errors.js";
import { getAzureBlobSettings, isAzureBlobStorageConfigured } from "./azure-blob-config.js";
import type { GrnDocumentKind } from "./grn-document-validation.js";
import { sanitizeGrnDocumentFilename } from "./grn-document-validation.js";

let blobServiceClient: BlobServiceClient | null = null;

function extensionForMime(mimeType: string): string {
  const normalized = mimeType.toLowerCase().split(";")[0]?.trim() ?? "";
  if (normalized === "application/pdf") return ".pdf";
  if (normalized === "image/jpeg" || normalized === "image/jpg") return ".jpg";
  return ".bin";
}

function storageErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return fallback;
}

function getBlobServiceClient(): BlobServiceClient {
  if (blobServiceClient) {
    return blobServiceClient;
  }
  const settings = getAzureBlobSettings();
  if (settings.connectionString.length > 0) {
    blobServiceClient = BlobServiceClient.fromConnectionString(settings.connectionString);
    return blobServiceClient;
  }
  if (settings.accountName.length > 0 && settings.accountKey.length > 0) {
    const credential = new StorageSharedKeyCredential(
      settings.accountName,
      settings.accountKey,
    );
    blobServiceClient = new BlobServiceClient(
      `https://${settings.accountName}.blob.core.windows.net`,
      credential,
    );
    return blobServiceClient;
  }
  throw new InventoryError(
    "Azure Storage is not configured (set AZURE_STORAGE_CONNECTION_STRING or account credentials)",
    503,
    "STORAGE_UNAVAILABLE",
  );
}

export function assertSafeGrnDocumentStorageKey(storageKey: string): void {
  const normalized = storageKey.replace(/\\/g, "/");
  if (
    normalized.length === 0 ||
    normalized.startsWith("/") ||
    normalized.includes("..") ||
    !normalized.startsWith("inventory/grn/")
  ) {
    throw new InventoryError("Invalid document storage key", 400, "VALIDATION_ERROR");
  }
}

function generateGrnDocumentStorageKey(input: {
  tenantId: string;
  grnId: string;
  kind: GrnDocumentKind;
  originalFilename: string;
  mimeType: string;
}): string {
  const safeName = sanitizeGrnDocumentFilename(input.originalFilename);
  const stem = safeName.replace(/\.[^.]+$/, "") || "document";
  const fileName = `${input.kind}-${stem}-${randomUUID().slice(0, 8)}${extensionForMime(input.mimeType)}`;
  return `inventory/grn/${input.tenantId}/${input.grnId}/${fileName}`;
}

export async function uploadGrnDocumentBlob(input: {
  tenantId: string;
  grnId: string;
  kind: GrnDocumentKind;
  bytes: Buffer;
  originalFilename: string;
  mimeType: string;
}): Promise<string> {
  if (!isAzureBlobStorageConfigured()) {
    throw new InventoryError(
      "Azure Blob Storage is not configured for GRN document uploads",
      503,
      "STORAGE_UNAVAILABLE",
    );
  }

  const settings = getAzureBlobSettings();
  const client = getBlobServiceClient();
  const containerClient = client.getContainerClient(settings.containerName);

  const storageKey = generateGrnDocumentStorageKey(input);
  assertSafeGrnDocumentStorageKey(storageKey);

  const blobClient = containerClient.getBlockBlobClient(storageKey);
  const uploadOptions: BlockBlobUploadOptions = {
    blobHTTPHeaders: {
      blobContentType: input.mimeType,
      blobCacheControl: "private, max-age=60",
      blobContentDisposition: "inline",
    },
    metadata: {
      originalFileName: sanitizeGrnDocumentFilename(input.originalFilename),
      uploadedAt: new Date().toISOString(),
      grnId: input.grnId,
      tenantId: input.tenantId,
      documentKind: input.kind,
    },
  };

  try {
    await containerClient.createIfNotExists();
    await blobClient.upload(input.bytes, input.bytes.length, uploadOptions);
  } catch (error) {
    if (error instanceof InventoryError) throw error;
    throw new InventoryError(
      storageErrorMessage(error, "Failed to upload GRN document to Azure Blob Storage"),
      503,
      "STORAGE_UPLOAD_FAILED",
    );
  }
  return storageKey;
}

export async function downloadGrnDocumentBlob(storageKey: string): Promise<{
  bytes: Buffer;
  contentType: string;
}> {
  if (!isAzureBlobStorageConfigured()) {
    throw new InventoryError(
      "Azure Blob Storage is not configured",
      503,
      "STORAGE_UNAVAILABLE",
    );
  }

  assertSafeGrnDocumentStorageKey(storageKey);

  const settings = getAzureBlobSettings();
  const blobClient = getBlobServiceClient()
    .getContainerClient(settings.containerName)
    .getBlockBlobClient(storageKey);

  try {
    const props = await blobClient.getProperties();
    const download = await blobClient.download();
    const chunks: Buffer[] = [];
    if (!download.readableStreamBody) {
      throw new InventoryError("Failed to download GRN document", 404, "NOT_FOUND");
    }
    for await (const chunk of download.readableStreamBody) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return {
      bytes: Buffer.concat(chunks),
      contentType: props.contentType ?? "application/octet-stream",
    };
  } catch (error) {
    if (error instanceof InventoryError) throw error;
    throw new InventoryError(
      storageErrorMessage(error, "Failed to download GRN document"),
      404,
      "NOT_FOUND",
    );
  }
}
