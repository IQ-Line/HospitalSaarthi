import type {
  BillingCaptureChargeInput,
  BillingCaptureChargeResult,
  BillingRecordPaymentInput,
  BillingWritePort,
} from "../ports.js";
import { BillingWriteError } from "./billing-write-error.js";

function joinUrl(base: string, path: string): string {
  const b = base.replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${b}${p}`;
}

function tenantHeaders(tenantId: string, bearerToken?: string): Record<string, string> {
  const headers: Record<string, string> = {
    iq_tenant_id: tenantId,
    "x-tenant-id": tenantId,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (bearerToken) {
    headers.Authorization = `Bearer ${bearerToken}`;
  }
  return headers;
}

type CaptureChargeWire = {
  bill_id?: string;
  data?: { bill_id?: string };
};

async function parseErrorBody(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return await res.text();
  }
}

function extractBillId(json: CaptureChargeWire): string | null {
  return json.bill_id ?? json.data?.bill_id ?? null;
}

export class HttpBillingWriteGateway implements BillingWritePort {
  constructor(private readonly billingServiceOrigin: string) {}

  async captureCharge(
    tenantId: string,
    input: BillingCaptureChargeInput,
    idempotencyKey: string,
    bearerToken?: string,
  ): Promise<BillingCaptureChargeResult> {
    const headers = {
      ...tenantHeaders(tenantId, bearerToken),
      "idempotency-key": idempotencyKey,
    };
    const url = joinUrl(this.billingServiceOrigin, "/api/billing/v1/charges");

    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(input),
      });
    } catch {
      throw new BillingWriteError(
        "Billing service unavailable",
        503,
        "billing_unavailable",
      );
    }

    const body = await parseErrorBody(res);
    if (!res.ok) {
      throw new BillingWriteError(
        "Billing charge capture failed",
        res.status,
        "billing_charge_failed",
        body,
      );
    }

    const billId = extractBillId(body as CaptureChargeWire);
    if (!billId) {
      throw new BillingWriteError(
        "Billing charge response missing bill_id",
        502,
        "billing_invalid_response",
        body,
      );
    }

    return { bill_id: billId };
  }

  async applyBillDiscount(
    tenantId: string,
    billId: string,
    discountAmount: number,
    discountReason?: string,
    bearerToken?: string,
  ): Promise<void> {
    const url = joinUrl(this.billingServiceOrigin, `/api/billing/v1/bills/${billId}`);
    let res: Response;
    try {
      res = await fetch(url, {
        method: "PATCH",
        headers: tenantHeaders(tenantId, bearerToken),
        body: JSON.stringify({
          discount_amount: discountAmount,
          discount_reason: discountReason ?? null,
        }),
      });
    } catch {
      throw new BillingWriteError(
        "Billing service unavailable",
        503,
        "billing_unavailable",
      );
    }

    if (!res.ok) {
      throw new BillingWriteError(
        "Billing discount apply failed",
        res.status,
        "billing_discount_failed",
        await parseErrorBody(res),
      );
    }
  }

  async finalizeBill(
    tenantId: string,
    billId: string,
    bearerToken?: string,
  ): Promise<void> {
    const url = joinUrl(
      this.billingServiceOrigin,
      `/api/billing/v1/bills/${billId}/finalize`,
    );
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: tenantHeaders(tenantId, bearerToken),
        body: JSON.stringify({}),
      });
    } catch {
      throw new BillingWriteError(
        "Billing service unavailable",
        503,
        "billing_unavailable",
      );
    }

    if (!res.ok) {
      const body = await parseErrorBody(res);
      const code =
        res.status === 409 || (typeof body === "object" && body !== null &&
          "code" in body &&
          (body as { code?: string }).code === "INVALID_STATUS")
          ? "billing_bill_not_draft"
          : "billing_finalize_failed";
      throw new BillingWriteError("Billing finalize failed", res.status, code, body);
    }
  }

  async recordPayment(
    tenantId: string,
    input: BillingRecordPaymentInput,
    idempotencyKey: string,
    bearerToken?: string,
  ): Promise<void> {
    const headers = {
      ...tenantHeaders(tenantId, bearerToken),
      "idempotency-key": idempotencyKey,
    };
    const url = joinUrl(this.billingServiceOrigin, "/api/billing/v1/payments");

    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(input),
      });
    } catch {
      throw new BillingWriteError(
        "Billing service unavailable",
        503,
        "billing_unavailable",
      );
    }

    if (!res.ok) {
      throw new BillingWriteError(
        "Billing payment failed",
        res.status,
        "billing_payment_failed",
        await parseErrorBody(res),
      );
    }
  }
}
