import type { FastifyInstance } from "fastify";
import type { CareContextRepo, BundleRepo } from "../ports.js";
import { storeBundle } from "../use-cases/store-bundle.js";
import { paramsIdSchema, storeBundleBodySchema } from "./schemas.js";
import { getCareContext } from "../use-cases/get-care-context.js";

interface HandlerDeps {
  careContextRepo: CareContextRepo;
  bundleRepo: BundleRepo;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function resolveCareContext(
  deps: HandlerDeps,
  tenantId: string,
  careContextKey: string,
) {
  if (UUID_RE.test(careContextKey)) {
    const byId = await getCareContext(
      { careContextRepo: deps.careContextRepo },
      tenantId,
      careContextKey,
    );
    if (byId) return byId;
  }
  return deps.careContextRepo.findBySourceRecordId(tenantId, careContextKey);
}

export function registerBundleHandlers(
  app: FastifyInstance,
  deps: HandlerDeps,
): void {
  app.get<{ Params: { id: string } }>(
    "/bundles/:id",
    { schema: { params: paramsIdSchema } },
    async (request, reply) => {
      const tenantId = request.tenantId;
      const { id } = request.params;

      const bundle = await deps.bundleRepo.findById(tenantId, id);
      if (!bundle) {
        return reply.code(404).send({
          type: "about:blank",
          title: "Not Found",
          status: 404,
          detail: "Bundle not found",
        });
      }

      return reply.send({ data: bundle });
    },
  );

  app.get<{ Params: { careContextId: string } }>(
    "/care-contexts/:careContextId/bundles",
    {
      schema: {
        params: {
          type: "object",
          required: ["careContextId"],
          properties: { careContextId: { type: "string", minLength: 1 } },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.tenantId;
      const { careContextId } = request.params;

      const context = await resolveCareContext(deps, tenantId, careContextId);
      if (!context) {
        return reply.code(404).send({
          type: "about:blank",
          title: "Not Found",
          status: 404,
          detail: "Care context not found",
        });
      }

      const rows = await deps.bundleRepo.findByCareContextId(tenantId, context.id);
      return reply.send({ data: rows });
    },
  );

  app.post<{ Body: Record<string, unknown> }>(
    "/bundles",
    { schema: { body: storeBundleBodySchema } },
    async (request, reply) => {
      const tenantId = request.tenantId;
      const body = request.body;

      // Pre-check the referenced care context so a missing one yields a clean 404
      // ProblemDetails instead of leaking the bundles->care_contexts FK violation
      // as an unhandled 500.
      const careContextId = body["care_context_id"] as string;
      const careContext = await getCareContext(
        { careContextRepo: deps.careContextRepo },
        tenantId,
        careContextId,
      );
      if (!careContext) {
        return reply.code(404).send({
          type: "about:blank",
          title: "Not Found",
          status: 404,
          detail: "Care context not found",
        });
      }

      const result = await storeBundle(
        { bundleRepo: deps.bundleRepo },
        tenantId,
        {
          careContextId,
          bundleKind: body["bundle_kind"] as string,
          fhirProfileUrl: body["fhir_profile_url"] as string,
          fhirProfileVersion: body["fhir_profile_version"] as string,
          producerKind: (body["producer_kind"] as string) ?? "platform_module",
          producerId: (body["producer_id"] as string) ?? tenantId,
          bundleJson: body["bundle_json"] as Record<string, unknown>,
          producedAt: new Date(body["produced_at"] as string),
        },
      );

      return reply.code(201).send({ data: result });
    },
  );
}
