import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// ---------------------------------------------------------------------------
// STRUCTURAL guard bound to services/integration-hub-svc/src/main.ts.
//
// The `/api/v3` scope terminates NHA gateway callbacks that authenticate via gateway
// signatures, NOT our JWT — so it is registered OUTSIDE identityPlugin and is
// deliberately un-gated. The sibling identity-partition-wiring.test.ts REBUILDS that
// arrangement with stand-in routes, so it cannot notice if someone mounts a NEW
// platform route into the real `/api/v3` block in main.ts — that route would silently
// inherit no-auth. This guard reads main.ts itself and pins the block's contents:
//   (a) the `/api/v3` scope registers ONLY the three known NHA callback registrars;
//   (b) identityPlugin (and any auth plugin) is NOT registered inside that block.
// Adding a route/registrar to that block, or leaking an auth plugin into it, fails here.
//
// Matching is on identifiers (not line numbers), so reformatting main.ts is fine.
// ---------------------------------------------------------------------------

const MAIN_TS = fileURLToPath(new URL("../../src/main.ts", import.meta.url));
// eslint-disable-next-line security/detect-non-literal-fs-filename -- fixed source path derived from import.meta.url
const source = readFileSync(MAIN_TS, "utf8");

// The exact set of registrars allowed inside the un-gated `/api/v3` scope. Keep in
// lockstep with main.ts — a mismatch here is a signal to review the partition, not to
// loosen the test.
const KNOWN_V3_REGISTRARS = [
  "registerM2CallbackRoutes",
  "registerM3CallbackRoutes",
  "registerScanShareCallbackRoutes",
].sort();

/**
 * Extract the callback body of
 *   `app.register(async (v3) => { ...BODY... }, { prefix: "/api/v3" })`.
 * Backtracking lands the closing brace on the one immediately before `, { prefix: "/api/v3" }`,
 * so nested object literals in a future body would still resolve correctly.
 */
function extractV3BlockBody(src: string): string {
  const match = src.match(
    /app\.register\(\s*async\s*\(\s*\w+\s*\)\s*=>\s*\{([\s\S]*?)\}\s*,\s*\{\s*prefix:\s*["']\/api\/v3["']\s*\}\s*\)/,
  );
  if (!match) {
    throw new Error(
      "Could not locate the `/api/v3` register block in main.ts. The callback-partition " +
        "structure changed — update this guard and re-confirm the /api/v3 scope is still " +
        "deliberately un-gated (gateway-signature auth, not JWT).",
    );
  }
  return match[1] as string;
}

/** Unique function-call identifiers appearing in a snippet (e.g. `foo(` -> "foo"). */
function calledIdentifiers(snippet: string): string[] {
  const names = new Set<string>();
  for (const m of snippet.matchAll(/\b([A-Za-z_]\w*)\s*\(/g)) {
    names.add(m[1] as string);
  }
  return [...names].sort();
}

describe("integration-hub-svc /api/v3 partition (structural guard on main.ts)", () => {
  it("(a) the /api/v3 scope registers ONLY the known NHA callback registrars", () => {
    const body = extractV3BlockBody(source);
    expect(calledIdentifiers(body)).toEqual(KNOWN_V3_REGISTRARS);
  });

  it("(b) no identity/auth plugin is registered inside the /api/v3 block", () => {
    const body = extractV3BlockBody(source);
    expect(body).not.toMatch(/\b(identityPlugin|authzPlugin|tenantPlugin)\b/);
  });

  it("identityPlugin IS still registered on the platform (/abdm/v1) scope — the gate exists", () => {
    // Guards against the block guard being satisfied by simply deleting auth everywhere.
    expect(source).toMatch(/register\(\s*identityPlugin/);
  });
});
