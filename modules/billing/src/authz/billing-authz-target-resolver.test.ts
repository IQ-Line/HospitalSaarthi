import { describe, expect, it } from "vitest";
import { createBillingAuthzTargetResolver } from "./billing-authz-target-resolver.js";

const TENANT = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const BILL_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function request(
  method: string,
  path: string,
  body?: unknown,
): Parameters<ReturnType<typeof createBillingAuthzTargetResolver>>[0] {
  return {
    method,
    url: `/api/billing/v1${path}`,
    routeOptions: { url: `/api/billing/v1${path}` },
    body,
    tenantId: TENANT,
  } as Parameters<ReturnType<typeof createBillingAuthzTargetResolver>>[0];
}

describe("createBillingAuthzTargetResolver", () => {
  const resolve = createBillingAuthzTargetResolver();

  it("maps POST /payments to invoice.update (not billing-account)", async () => {
    const target = await resolve(
      request("POST", "/payments", { bill_id: BILL_ID, amount: 100, payment_method: "CASH" }),
    );
    expect(target).toEqual({
      kind: "invoice",
      id: BILL_ID,
      action: "invoice.update",
      attr: { iq_tenant_id: TENANT },
    });
  });

  it("uses placeholder bill id when payment body is absent (startup probe)", async () => {
    const target = await resolve(request("POST", "/payments"));
    expect(target).toEqual({
      kind: "invoice",
      id: "new",
      action: "invoice.update",
      attr: { iq_tenant_id: TENANT },
    });
  });
});
