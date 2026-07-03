import type { DrizzleInventoryGrnRepository } from "../data-access/grn.repo.js";
import { GrnNotFoundError, InventoryError } from "../errors.js";
import type { GrnDocumentKind } from "../lib/grn-document-validation.js";
import { readGrnDocumentFile } from "../lib/grn-document-storage.js";

export type GetGrnDocumentDeps = {
  grnRepo: DrizzleInventoryGrnRepository;
};

export async function getGrnDocument(
  deps: GetGrnDocumentDeps,
  tenantId: string,
  grnId: string,
  kind: GrnDocumentKind,
) {
  const grn = await deps.grnRepo.findById(tenantId, grnId);
  if (!grn) throw new GrnNotFoundError();

  const relativePath =
    kind === "shipment" ? grn.shipment_document_path : grn.voucher_document_path;
  if (!relativePath?.trim()) {
    throw new InventoryError(`No ${kind} document uploaded for this GRN`, 404, "NOT_FOUND");
  }

  return readGrnDocumentFile(relativePath);
}
