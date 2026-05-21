import type { FastifyInstance } from "fastify";
import type { BillingDeps } from "../ports.js";
import { parseIdempotencyKey, protectedRoute } from "../lib/fastify-helpers.js";
import { sendUseCaseResult } from "../lib/handler-result.js";
import { renderReceiptHtml } from "../lib/receipt-html.js";
import { applyBillDiscount } from "../use-cases/apply-bill-discount.js";
import { cancelBill } from "../use-cases/cancel-bill.js";
import { captureCharge } from "../use-cases/capture-charge.js";
import { finalizeBill } from "../use-cases/finalize-bill.js";
import { getBill } from "../use-cases/get-bill.js";
import { recordPayment } from "../use-cases/record-payment.js";
import {
  applyBillDiscountRouteSchema,
  cancelBillRouteSchema,
  captureChargeRouteSchema,
  finalizeBillRouteSchema,
  getBillRouteSchema,
  receiptRouteSchema,
  recordPaymentRouteSchema,
} from "./billing-schemas.js";

type BillParams = { bill_id: string };

export function registerBillingHandlers(app: FastifyInstance, deps: BillingDeps): void {
  app.post(
    "/charges",
    { ...protectedRoute, schema: captureChargeRouteSchema },
    async (req, reply) => {
      const result = await captureCharge(deps, req.tenantId, req.body, parseIdempotencyKey(req.headers));
      return sendUseCaseResult(reply, result, { successCode: 201, wrapData: false });
    },
  );

  app.get<{ Params: BillParams }>(
    "/bills/:bill_id",
    { ...protectedRoute, schema: getBillRouteSchema },
    async (req, reply) => sendUseCaseResult(reply, await getBill(deps, req.tenantId, req.params.bill_id)),
  );

  app.patch<{ Params: BillParams }>(
    "/bills/:bill_id",
    { ...protectedRoute, schema: applyBillDiscountRouteSchema },
    async (req, reply) =>
      sendUseCaseResult(
        reply,
        await applyBillDiscount(deps, req.tenantId, req.params.bill_id, req.body),
      ),
  );

  app.post<{ Params: BillParams }>(
    "/bills/:bill_id/finalize",
    { ...protectedRoute, schema: finalizeBillRouteSchema },
    async (req, reply) =>
      sendUseCaseResult(reply, await finalizeBill(deps, req.tenantId, req.params.bill_id)),
  );

  app.post<{ Params: BillParams }>(
    "/bills/:bill_id/cancel",
    { ...protectedRoute, schema: cancelBillRouteSchema },
    async (req, reply) =>
      sendUseCaseResult(
        reply,
        await cancelBill(deps, req.tenantId, req.params.bill_id, req.body),
      ),
  );

  app.get<{ Params: BillParams }>(
    "/bills/:bill_id/receipt.pdf",
    { ...protectedRoute, schema: receiptRouteSchema },
    async (req, reply) => {
      const result = await getBill(deps, req.tenantId, req.params.bill_id);
      if (!result.ok) return sendUseCaseResult(reply, result);
      return reply.type("text/html").send(renderReceiptHtml(result.data.bill, result.data.items));
    },
  );

  app.post(
    "/payments",
    { ...protectedRoute, schema: recordPaymentRouteSchema },
    async (req, reply) =>
      sendUseCaseResult(reply, await recordPayment(deps, req.tenantId, req.body), {
        successCode: 201,
        mapSuccess: (d) => ({ ...d, bill_status: d.bill.status }),
      }),
  );
}
