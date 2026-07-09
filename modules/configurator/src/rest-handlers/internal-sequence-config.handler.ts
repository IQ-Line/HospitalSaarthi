import type { FastifyInstance } from "fastify";
import type { SequenceConfigurationRepo, TenantRepo } from "../ports.js";
import { assertConfiguratorInternalAccess } from "../http/assert-configurator-internal-access.js";

export type InternalSequenceConfigHandlerDeps = {
  tenantRepo: TenantRepo;
  sequenceConfigurationRepo: SequenceConfigurationRepo;
};

/**
 * Internal S2S route serving a tenant's sequence configuration to identifier-allocating services
 * (empi, registration, billing) — replacing their former cross-schema reads of
 * `configurator.tenants` + `configurator.sequence_configuration`.
 *
 * Reads configurator's OWN tables and returns exactly the two fields the allocator needs. Skips JWT
 * identity (path is under configurator-svc's `/internal/` skip prefix) and self-gates on
 * `x-configurator-internal-key` (`CONFIGURATOR_INTERNAL_API_KEY`).
 */
export function registerInternalSequenceConfigHandler(
  app: FastifyInstance,
  deps: InternalSequenceConfigHandlerDeps,
): void {
  app.get<{ Params: { tenantId: string } }>(
    "/internal/tenants/:tenantId/sequence-config",
    async (request, reply) => {
      assertConfiguratorInternalAccess(request);
      const tenant = await deps.tenantRepo.findById(request.params.tenantId);
      if (!tenant) {
        return reply.status(404).send({ error: "Tenant not found", code: "NOT_FOUND" });
      }
      const config = await deps.sequenceConfigurationRepo.findByTenantId(
        request.params.tenantId,
      );
      return {
        tenant_numeric_code: tenant.tenant_numeric_code ?? null,
        identifier_overrides: config?.identifier_overrides ?? {},
      };
    },
  );
}
