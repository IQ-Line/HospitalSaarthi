import type { FastifyInstance } from "fastify";
import type {
  CareContextRepo,
  BundleManifestRepo,
  BundleStorageRepo,
} from "../ports.js";
import { evaluateDisclosure } from "../use-cases/evaluate-disclosure.js";
import { disclosureBodySchema } from "./schemas.js";

interface HandlerDeps {
  careContextRepo: CareContextRepo;
  bundleManifestRepo: BundleManifestRepo;
  bundleStorageRepo: BundleStorageRepo;
}

export function registerDisclosureHandlers(
  app: FastifyInstance,
  deps: HandlerDeps,
): void {
  app.post<{ Body: Record<string, unknown> }>(
    "/disclosures",
    { schema: { body: disclosureBodySchema } },
    async (request, reply) => {
      const tenantId = request.tenantId;
      const body = request.body;

      const result = await evaluateDisclosure(
        {
          careContextRepo: deps.careContextRepo,
          bundleManifestRepo: deps.bundleManifestRepo,
          bundleStorageRepo: deps.bundleStorageRepo,
        },
        tenantId,
        {
          consent_artifact_id: body["consent_artifact_id"] as string,
          patient_id: body["patient_id"] as string,
          hi_types: body["hi_types"] as string[],
          date_range: body["date_range"] as { from: string; to: string },
          care_context_ids: body["care_context_ids"] as string[] | undefined,
        },
      );

      return reply.send(result);
    },
  );
}
