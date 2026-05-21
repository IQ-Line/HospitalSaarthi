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
    // Treat everything in node_modules as external by default. Without this,
    // tsup only externalizes deps listed in the CWD's package.json, which
    // misses transitively-imported deps (e.g., drizzle-orm pulled in via
    // @hims/ts-sdk-db) and esbuild fails to resolve them.
    skipNodeModulesBundle: true,
    // Force-bundle workspace @hims/* packages from source so we don't need
    // a separate build step for each module/package.
    noExternal: [/^@hims\//],
  };
}

export default defineConfig(sharedConfig({ entry: [] }));
