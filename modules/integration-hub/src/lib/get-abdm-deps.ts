import type { FastifyRequest } from "fastify";
import type { AbdmAdapterDeps } from "../integrations/abdm/ports.js";
import { IntegrationContextMissingError } from "./integration-hub-errors.js";

export function getAbdmDeps(request: FastifyRequest): AbdmAdapterDeps {
  const deps = request.integrationCtx?.deps;
  if (!deps) {
    throw new IntegrationContextMissingError();
  }
  return deps;
}
