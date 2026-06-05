import type { FastifyRequest } from "fastify";
import type {
  IntegrationApiKeysRepository,
  IntegrationsRepository,
  PartnerPrincipalGateway,
} from "./ports.js";

export type ControlPlaneRouterOptions = {
  integrationsRepository: IntegrationsRepository;
  integrationApiKeysRepository: IntegrationApiKeysRepository;
  partnerPrincipalGateway: PartnerPrincipalGateway;
  getTenantId: (request: FastifyRequest) => string;
  getActorId: (request: FastifyRequest) => string;
  getAuthorizationHeader: (request: FastifyRequest) => string;
};
