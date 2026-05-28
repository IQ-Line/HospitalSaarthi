import type { AuthzTargetResolver } from "@hims/ts-sdk-authz";
import {
  resolveRoutePattern,
  resolvePathParam,
  iqTenantAttr,
} from "@hims/ts-sdk-authz";

const ROUTE_PREFIX = "/api/billing/v1";

export function createBillingAuthzTargetResolver(): AuthzTargetResolver {
  return async (request) => {
    const path = resolveRoutePattern(request, ROUTE_PREFIX);
    const method = request.method === "HEAD" ? "GET" : request.method;

    if (method === "GET" && path === "/services") {
      return { kind: "tariff_master", id: "list", action: "tariff-master.read", attr: iqTenantAttr(request) };
    }

    if (method === "POST" && path === "/services") {
      return { kind: "tariff_master", id: "new", action: "tariff-master.create", attr: iqTenantAttr(request) };
    }

    if (method === "PATCH" && path === "/services/:service_id") {
      const id = resolvePathParam(request, "service_id");
      if (id === null) return null;
      return { kind: "tariff_master", id, action: "tariff-master.update", attr: iqTenantAttr(request) };
    }

    if (method === "POST" && path === "/charges") {
      return { kind: "invoice", id: "new", action: "invoice.create", attr: iqTenantAttr(request) };
    }

    if (method === "GET" && path === "/bills") {
      return { kind: "invoice", id: "list", action: "invoice.read", attr: iqTenantAttr(request) };
    }

    if (method === "GET" && path === "/bills/:bill_id") {
      const id = resolvePathParam(request, "bill_id");
      if (id === null) return null;
      return { kind: "invoice", id, action: "invoice.read", attr: iqTenantAttr(request) };
    }

    if (method === "PATCH" && path === "/bills/:bill_id") {
      const id = resolvePathParam(request, "bill_id");
      if (id === null) return null;
      return { kind: "invoice", id, action: "invoice.update", attr: iqTenantAttr(request) };
    }

    if (method === "POST" && path === "/bills/:bill_id/finalize") {
      const id = resolvePathParam(request, "bill_id");
      if (id === null) return null;
      return { kind: "invoice", id, action: "invoice.update", attr: iqTenantAttr(request) };
    }

    if (method === "POST" && path === "/bills/:bill_id/cancel") {
      const id = resolvePathParam(request, "bill_id");
      if (id === null) return null;
      return { kind: "invoice", id, action: "invoice.delete", attr: iqTenantAttr(request) };
    }

    if (method === "GET" && path === "/bills/:bill_id/receipt.pdf") {
      const id = resolvePathParam(request, "bill_id");
      if (id === null) return null;
      return { kind: "invoice", id, action: "invoice.read", attr: iqTenantAttr(request) };
    }

    if (method === "POST" && path === "/payments") {
      return { kind: "billing_account", id: "new", action: "billing-account.create", attr: iqTenantAttr(request) };
    }

    return null;
  };
}
