import { createRequire } from "node:module";

/**
 * RFC 8785 JSON Canonicalization (`canonicalize`).
 *
 * The package is CommonJS (`module.exports = fn`) but its bundled `.d.ts` models
 * it as `export default function`, which under `moduleResolution: NodeNext`
 * resolves to the module namespace rather than a callable — a plain
 * `import canonicalize from "canonicalize"` is therefore not callable at the type
 * level. We load it via `createRequire` and annotate the binding with the real
 * signature: runtime-correct (the CJS export is the function) and type-correct.
 */
const nodeRequire = createRequire(import.meta.url);

export const canonicalizeJson: (input: unknown) => string | undefined =
  nodeRequire("canonicalize");
