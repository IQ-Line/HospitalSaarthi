import type { AuthzTargetResolver, AuthzTarget } from "@hims/ts-sdk-authz";
import {
  resolveRoutePattern,
  resolvePathParam,
  iqTenantAttr,
} from "@hims/ts-sdk-authz";

const PREFIX = "/api/registration/v1";

export function createRegistrationAuthzTargetResolver(): AuthzTargetResolver {
  return (request): AuthzTarget | null => {
    const path = resolveRoutePattern(request, PREFIX);
    const method = request.method === "HEAD" ? "GET" : request.method;

    if (method === "GET" && path === "/registrations") {
      return { kind: "registration", id: "list", action: "registration.read", attr: iqTenantAttr(request) };
    }

    if (method === "GET" && path === "/registrations/:registrationId") {
      const id = resolvePathParam(request, "registrationId");
      return { kind: "registration", id: id ?? "detail", action: "registration.read", attr: iqTenantAttr(request) };
    }

    if (method === "POST" && path === "/workflows/new-patient/registrations") {
      return { kind: "registration", id: "new", action: "registration.create", attr: iqTenantAttr(request) };
    }

    if (method === "POST" && path === "/workflows/existing-patient/registrations") {
      return { kind: "registration", id: "new", action: "registration.create", attr: iqTenantAttr(request) };
    }

    if (method === "POST" && path === "/registrations/:registrationId/complete") {
      const id = resolvePathParam(request, "registrationId");
      return { kind: "registration", id: id ?? "complete", action: "registration.update", attr: iqTenantAttr(request) };
    }

    return null;
  };
}
