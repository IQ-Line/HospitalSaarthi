import { defineConfig, type Options } from "tsup";

/**
 * Shared tsup config for HIMS TypeScript services.
 *
 * Bundles workspace `@hims/*` deps into the output (so we don't have to
 * pre-build every module separately). Externalizes npm deps so they're
 * loaded from `node_modules` at runtime (smaller bundle, faster cold start,
 * native modules work).
 *
 * Each service has a tiny `tsup.config.ts` that re-exports this with
 * service-local entry points.
 */
export function sharedConfig(opts: Pick<Options, "entry">): Options {
  return {
    ...opts,
    format: ["esm"],
    target: "node24",
    outDir: "dist",
    clean: true,
    bundle: true,
    splitting: false,
    sourcemap: true,
    platform: "node",
    // Bundle workspace deps so we don't need a separate build step for each.
    // Everything else (fastify, pg, drizzle-orm, etc.) stays external.
    noExternal: [/^@hims\//],
    // tsup defaults to externalizing deps listed in package.json. That's what we want
    // for npm deps; only the @hims/* override above changes behavior.
  };
}

export default defineConfig(sharedConfig({ entry: [] }));
