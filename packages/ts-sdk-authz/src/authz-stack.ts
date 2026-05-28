import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { assertCerbosReachable } from "./cerbos-startup-probe.js";
import { authzPlugin } from "./plugin.js";
import type { AuthzTargetResolver } from "./types.js";

export interface RegisterAuthzStackOptions {
  cerbosUrl: string;
  identityPlugin: FastifyPluginAsync;
  identityAuth: Record<string, unknown>;
  principalEnrichmentPlugin: FastifyPluginAsync;
  principalEnrichmentOptions: { principalService: unknown; userRepository: unknown };
  resolveTarget?: AuthzTargetResolver;
  skipAuthPrefixes?: string[];
}

export async function registerAuthzStack(
  app: FastifyInstance,
  options: RegisterAuthzStackOptions,
): Promise<void> {
  const {
    cerbosUrl,
    identityPlugin,
    identityAuth,
    principalEnrichmentPlugin,
    principalEnrichmentOptions,
    resolveTarget,
    skipAuthPrefixes,
  } = options;

  await assertCerbosReachable(cerbosUrl);

  await app.register(identityPlugin, {
    ...identityAuth,
    ...(skipAuthPrefixes ? { skipPathPrefixes: skipAuthPrefixes } : {}),
  });

  await app.register(principalEnrichmentPlugin, principalEnrichmentOptions);

  await app.register(authzPlugin, {
    cerbosUrl,
    ...(resolveTarget ? { resolveTarget } : {}),
  });
}
