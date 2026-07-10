import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import type { IntegrationHubSharedInfra } from "../../lib/build-abdm-deps.js";
import { registerPlatformRoutesWithIntegrationContext } from "../../lib/integration-context-resolver.js";
import {
  registerM0Routes,
  registerM0DiscoveryRoutes,
  registerM1Routes,
  registerM2PlatformRoutes,
  registerM3PlatformRoutes,
  registerScanShareRoutes,
} from "./rest-handlers/index.js";

export type AbdmAdapterRouterOptions = IntegrationHubSharedInfra;

/**
 * Installs the capability PEP (principal enricher + Cerbos authzPlugin) onto the
 * gated child scope that carries the user-facing M2/M3 platform routes. Supplied by
 * the service (integration-hub-svc) which owns the auth deps. When omitted (unit
 * tests that don't exercise authz), M2/M3 register without gating — the routes are
 * still flagged `authMode:"protected"`, so a live service that forgets to pass an
 * installer would fail the authzPlugin onReady probe rather than ship them open.
 */
export type PlatformCapabilityGuardInstaller = (app: FastifyInstance) => Promise<void>;

async function abdmAdapterRouter(
  app: FastifyInstance,
  sharedInfra: IntegrationHubSharedInfra,
  installPlatformCapabilityGuards?: PlatformCapabilityGuardInstaller,
): Promise<void> {
  await app.register(async (discovery) => {
    await registerM0DiscoveryRoutes(discovery, sharedInfra);
  });

  await app.register(async (platform) => {
    await platform.register(
      registerPlatformRoutesWithIntegrationContext(sharedInfra, async (scoped) => {
        // Identity-only routes (unchanged): M0 discovery, M1 ABHA enrol/login, scan-share.
        await registerM0Routes(scoped);
        await registerM1Routes(scoped);
        await registerScanShareRoutes(scoped);

        // Capability-gated routes: M2 care-context linking + M3 HIU consent/health-data.
        // These live in a nested child scope so the principal enricher + Cerbos PEP apply
        // ONLY here — the surrounding M0/M1/scan-share routes keep their identity-only auth.
        await scoped.register(async (gated) => {
          if (installPlatformCapabilityGuards) {
            await installPlatformCapabilityGuards(gated);
          }
          await registerM2PlatformRoutes(gated);
          await registerM3PlatformRoutes(gated);
        });
      }),
    );
  });
}

export function createRouter(
  sharedInfra: IntegrationHubSharedInfra,
  installPlatformCapabilityGuards?: PlatformCapabilityGuardInstaller,
) {
  return fp(
    async (app: FastifyInstance) =>
      abdmAdapterRouter(app, sharedInfra, installPlatformCapabilityGuards),
    { fastify: "5.x", name: "@hims/integration-hub-abdm-router" },
  );
}
