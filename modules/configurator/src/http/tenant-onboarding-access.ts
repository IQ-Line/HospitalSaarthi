import type { FastifyRequest } from "fastify";
import type { ProvisionTenantInput } from "../domain/onboarding.types.js";
import { ConfiguratorError } from "../errors.js";
import {
  getRequestAuthContext,
  isPlatformSuperAdmin,
} from "./request-auth-context.js";

/**
 * Platform super-admins may pick or create any organisation in tenant onboarding.
 * Other roles may only provision tenants under their JWT `org_id`.
 */
export function assertTenantOnboardingAllowed(
  request: FastifyRequest,
  input: ProvisionTenantInput,
): void {
  const { roles, orgId } = getRequestAuthContext(request);
  if (isPlatformSuperAdmin(roles)) {
    return;
  }

  const requestedOrgId = input.organization.id?.trim();
  if (!requestedOrgId) {
    throw new ConfiguratorError(
      403,
      "organization.id is required for tenant onboarding",
      "FORBIDDEN",
    );
  }
  if (!orgId) {
    throw new ConfiguratorError(
      403,
      "tenant onboarding requires an organization scope on your account",
      "FORBIDDEN",
    );
  }
  if (requestedOrgId !== orgId) {
    throw new ConfiguratorError(
      403,
      "tenant onboarding is limited to your organization",
      "FORBIDDEN",
    );
  }
}
