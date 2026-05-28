import type { FastifyInstance } from "fastify";
import type { BillingDeps } from "../ports.js";
import { parseIdempotencyKey } from "../lib/fastify-helpers.js";
import { sendUseCaseResult } from "../lib/handler-result.js";
import { renderReceiptHtml } from "../lib/receipt-html.js";
import { applyBillDiscount } from "../use-cases/apply-bill-discount.js";
import { cancelBill } from "../use-cases/cancel-bill.js";
import { captureCharge } from "../use-cases/capture-charge.js";
import { finalizeBill } from "../use-cases/finalize-bill.js";
import { getBill } from "../use-cases/get-bill.js";
import { listBills } from "../use-cases/list-bills.js";
import { recordPayment } from "../use-cases/record-payment.js";
import type { BillStatus, ListBillsQuery } from "../domain/bill.types.js";
import {
  applyBillDiscountRouteSchema,
  cancelBillRouteSchema,
  captureChargeRouteSchema,
  finalizeBillRouteSchema,
  getBillRouteSchema,
  listBillsRouteSchema,
  receiptRouteSchema,
  recordPaymentRouteSchema,
} from "./billing-schemas.js";

type BillParams = { bill_id: string };

type ListBillsQuerystring = {
  patient_id?: string;
  visit_id?: string;
  status?: BillStatus;
  bill_type?: string;
  from_date?: string;
  to_date?: string;
  limit?: string;
  cursor?: string;
};

function parseListBillsQuery(q: ListBillsQuerystring): ListBillsQuery {
  const limit = q.limit === undefined ? undefined : Number.parseInt(q.limit, 10);
  return {
    patient_id: q.patient_id,
    visit_id: q.visit_id,
    status: q.status,
    bill_type: q.bill_type,
    from_date: q.from_date,
    to_date: q.to_date,
    limit: Number.isFinite(limit) ? limit : undefined,
    cursor: q.cursor,
  };
}

export function registerBillingHandlers(app: FastifyInstance, deps: BillingDeps): void {
  app.post(
    "/charges",
    { config: { authMode: "protected" as const, authz: { kind: "invoice", id: "new", action: "invoice.create" } }, schema: captureChargeRouteSchema },
    async (req, reply) => {
      const result = await captureCharge(deps, req.tenantId, req.body, parseIdempotencyKey(req.headers));
      return sendUseCaseResult(reply, result, { successCode: 201, wrapData: false });
    },
  );

  app.get<{ Querystring: ListBillsQuerystring }>(
    "/bills",
    { config: { authMode: "protected" as const, authz: { kind: "invoice", id: "list", action: "invoice.read" } }, schema: listBillsRouteSchema },
    async (req, reply) => {
      const result = await listBills(deps, req.tenantId, parseListBillsQuery(req.query));
      return reply.send(result);
    },
  );

  app.get<{ Params: BillParams }>(
    "/bills/:bill_id",
    { config: { authMode: "protected" as const, authz: { kind: "invoice", id: (req) => req.params.bill_id, action: "invoice.read" } }, schema: getBillRouteSchema },
    async (req, reply) => sendUseCaseResult(reply, await getBill(deps, req.tenantId, req.params.bill_id)),
  );

  app.patch<{ Params: BillParams }>(
    "/bills/:bill_id",
    { config: { authMode: "protected" as const, authz: { kind: "invoice", id: (req) => req.params.bill_id, action: "invoice.update" } }, schema: applyBillDiscountRouteSchema },
    async (req, reply) =>
      sendUseCaseResult(
        reply,
        await applyBillDiscount(deps, req.tenantId, req.params.bill_id, req.body),
      ),
  );

  app.post<{ Params: BillParams }>(
    "/bills/:bill_id/finalize",
    { config: { authMode: "protected" as const, authz: { kind: "invoice", id: (req) => req.params.bill_id, action: "invoice.update" } }, schema: finalizeBillRouteSchema },
    async (req, reply) =>
      sendUseCaseResult(reply, await finalizeBill(deps, req.tenantId, req.params.bill_id)),
  );

  app.post<{ Params: BillParams }>(
    "/bills/:bill_id/cancel",
    { config: { authMode: "protected" as const, authz: { kind: "invoice", id: (req) => req.params.bill_id, action: "invoice.delete" } }, schema: cancelBillRouteSchema },
    async (req, reply) =>
      sendUseCaseResult(
        reply,
        await cancelBill(deps, req.tenantId, req.params.bill_id, req.body),
      ),
  );

  app.get<{ Params: BillParams }>(
    "/bills/:bill_id/receipt.pdf",
    { config: { authMode: "protected" as const, authz: { kind: "invoice", id: (req) => req.params.bill_id, action: "invoice.read" } }, schema: receiptRouteSchema },
    async (req, reply) => {
      const result = await getBill(deps, req.tenantId, req.params.bill_id);
      if (!result.ok) return sendUseCaseResult(reply, result);
      return reply.type("text/html").send(renderReceiptHtml(result.data.bill, result.data.items));
    },
  );

  app.post(
    "/payments",
    { config: { authMode: "protected" as const, authz: { kind: "billing_account", id: "new", action: "billing-account.create" } }, schema: recordPaymentRouteSchema },
    async (req, reply) =>
      sendUseCaseResult(reply, await recordPayment(deps, req.tenantId, req.body), {
        successCode: 201,
        mapSuccess: (d) => ({ ...d, bill_status: d.bill.status }),
      }),
  );
}
