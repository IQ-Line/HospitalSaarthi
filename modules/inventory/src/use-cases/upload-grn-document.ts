import type { DrizzleInventoryGrnRepository } from "../data-access/grn.repo.js";
import { GrnNotFoundError, GrnValidationError } from "../errors.js";
import {
  type GrnDocumentKind,
  validateGrnDocumentUpload,
} from "../lib/grn-document-validation.js";
import { saveGrnDocumentFile } from "../lib/grn-document-storage.js";
import { wireGrn } from "./list-grns.js";

export type UploadGrnDocumentDeps = {
  grnRepo: DrizzleInventoryGrnRepository;
};

export type UploadGrnDocumentInput = {
  bytes: Buffer;
  filename: string;
  mimeType: string;
};

export async function uploadGrnDocument(
  deps: UploadGrnDocumentDeps,
  tenantId: string,
  grnId: string,
  kind: GrnDocumentKind,
  input: UploadGrnDocumentInput,
) {
  const existing = await deps.grnRepo.findById(tenantId, grnId);
  if (!existing) throw new GrnNotFoundError();
  if (existing.status !== "draft") {
    throw new GrnValidationError("Cannot upload documents on a submitted GRN");
  }

  validateGrnDocumentUpload(input.mimeType, input.bytes.length);

  const storagePath = await saveGrnDocumentFile({
    tenantId,
    grnId,
    kind,
    bytes: input.bytes,
    originalFilename: input.filename,
    mimeType: input.mimeType,
  });

  const field = kind === "shipment" ? "shipment_document_path" : "voucher_document_path";
  const row = await deps.grnRepo.updateDocumentPath(tenantId, grnId, field, storagePath);
  if (!row) throw new GrnNotFoundError();

  return {
    ...wireGrn(row)!,
    document_kind: kind,
    document_path: storagePath,
    original_filename: input.filename,
  };
}
