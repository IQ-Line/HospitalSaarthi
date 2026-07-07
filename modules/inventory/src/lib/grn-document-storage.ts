import type { GrnDocumentKind } from "./grn-document-validation.js";
import {
  assertSafeGrnDocumentStorageKey,
  downloadGrnDocumentBlob,
  uploadGrnDocumentBlob,
} from "./grn-document-blob-storage.js";

export { assertSafeGrnDocumentStorageKey as assertSafeGrnDocumentRelativePath };

export async function saveGrnDocumentFile(input: {
  tenantId: string;
  grnId: string;
  kind: GrnDocumentKind;
  bytes: Buffer;
  originalFilename: string;
  mimeType: string;
}): Promise<string> {
  return uploadGrnDocumentBlob(input);
}

export async function readGrnDocumentFile(storageKey: string): Promise<{
  bytes: Buffer;
  contentType: string;
}> {
  return downloadGrnDocumentBlob(storageKey);
}
