#!/usr/bin/env node
// Guard against nx target drift: every project must expose the targets its class
// requires (the drift class this repo hand-fixed: services with no lint target,
// phantom test targets, duplicate migrate targets). Full plugin inference was
// evaluated and rejected (config is centralized at the root; inference would infer
// nothing) — this checker is the cheap alternative.
//
// Usage:  node tools/check-nx-target-conformance.mjs            # check the repo
//         node tools/check-nx-target-conformance.mjs --self-test # prove detection works
import { execSync } from "node:child_process";

// ---- policy: required targets per project class (encodes the healthy post-cleanup state)
function requiredTargets(project) {
  const top = project.root.split("/")[0];
  const py = project.tags.includes("language:python");
  switch (top) {
    case "modules":
      // Python modules have no typecheck step; TS modules must typecheck.
      return py ? ["lint", "test", "test:integration"] : ["lint", "typecheck", "test", "test:integration"];
    case "services":
      // Services are thin composition shells; module logic carries the tests.
      return py ? ["lint", "serve"] : ["lint", "typecheck", "build", "serve"];
    case "packages":
      // 'test' is deliberately NOT required: only packages with real test files have it.
      return py ? ["lint", "test"] : ["lint", "typecheck"];
    case "infra":
      return []; // infra/cerbos: compile only, checked by its own CI job
    default:
      return null; // unknown layout — flagged as a violation below
  }
}

// ---- allowlist: per-project target exemptions; every entry needs a one-line reason
const ALLOWLIST = {
  "@pulse/blocks":     { exempt: ["lint", "typecheck"], reason: "vendored Pulse UI package from IQSandbox; deliberately not lint/typecheck-wired" },
  "@pulse/constants":  { exempt: ["lint", "typecheck"], reason: "vendored Pulse UI package from IQSandbox; deliberately not lint/typecheck-wired" },
  "@pulse/layouts":    { exempt: ["lint", "typecheck"], reason: "vendored Pulse UI package from IQSandbox; deliberately not lint/typecheck-wired" },
  "@pulse/patterns":   { exempt: ["lint", "typecheck"], reason: "vendored Pulse UI package from IQSandbox; deliberately not lint/typecheck-wired" },
  "@pulse/ui":         { exempt: ["lint", "typecheck"], reason: "vendored Pulse UI package from IQSandbox; deliberately not lint/typecheck-wired" },
  "@pulse/utils":      { exempt: ["lint", "typecheck"], reason: "vendored Pulse UI package from IQSandbox; deliberately not lint/typecheck-wired" },
  "@hims/eslint-config": { exempt: ["lint", "typecheck"], reason: "config-only package (shared ESLint flat config, plain JS); no lint/typecheck wiring" },
  "@hims/tsconfig":      { exempt: ["lint", "typecheck"], reason: "config-only package (shared tsconfig JSON presets); no source code" },
  "@hims/dev-bootstrap": { exempt: ["lint", "typecheck"], reason: "dev-only bootstrap helper consumed as raw TS source by consumers; no target wiring" },
};

// ---- pure evaluation (also exercised by --self-test)
function evaluate(projects) {
  const violations = [];
  const known = new Set(projects.map((p) => p.name));
  for (const name of Object.keys(ALLOWLIST)) {
    if (!known.has(name)) violations.push(`allowlist entry '${name}' matches no project — remove it`);
  }
  for (const p of projects) {
    const required = requiredTargets(p);
    if (required === null) {
      violations.push(`${p.name} (${p.root}): unclassified project root — extend the policy in tools/check-nx-target-conformance.mjs`);
      continue;
    }
    const exempt = new Set(ALLOWLIST[p.name]?.exempt ?? []);
    for (const t of required) {
      if (!p.targets.includes(t) && !exempt.has(t)) {
        violations.push(`${p.name} (${p.root}): missing required target '${t}'`);
      }
    }
  }
  return violations;
}

// ---- self-test: prove the checker actually catches a missing target
function selfTest() {
  const bad = { name: "synthetic-svc", root: "services/synthetic-svc", tags: ["type:service", "language:typescript"], targets: ["typecheck", "build", "serve"] }; // no lint
  const good = { name: "synthetic-ok", root: "services/synthetic-ok", tags: ["type:service", "language:typescript"], targets: ["lint", "typecheck", "build", "serve"] };
  const stray = { name: "synthetic-stray", root: "tools/synthetic-stray", tags: [], targets: [] }; // unclassified root
  const allowNames = Object.keys(ALLOWLIST).map((name) => ({ name, root: "packages/x", tags: [], targets: ["lint", "typecheck"] }));
  const v = evaluate([bad, good, stray, ...allowNames]);
  const checks = [
    [v.some((m) => m.startsWith("synthetic-svc") && m.includes("'lint'")), "missing lint on a TS service is flagged"],
    [v.some((m) => m.startsWith("synthetic-stray") && m.includes("unclassified")), "unclassified project root is flagged"],
    [!v.some((m) => m.startsWith("synthetic-ok")), "conformant project produces no violation"],
  ];
  let ok = true;
  for (const [pass, desc] of checks) {
    console.log(`${pass ? "PASS" : "FAIL"}: ${desc}`);
    if (!pass) ok = false;
  }
  console.log(ok ? "self-test passed" : "self-test FAILED");
  process.exit(ok ? 0 : 1);
}

// ---- main
if (process.argv.includes("--self-test")) selfTest();

const sh = (cmd) => execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] });
const names = JSON.parse(sh("npx nx show projects --json"));
const projects = names.map((name) => {
  const p = JSON.parse(sh(`npx nx show project "${name}" --json`));
  return { name, root: p.root, tags: p.tags ?? [], targets: Object.keys(p.targets ?? {}) };
});

const violations = evaluate(projects);
if (violations.length > 0) {
  console.error(`nx target conformance: ${violations.length} violation(s)`);
  for (const v of violations) console.error(`  - ${v}`);
  process.exit(1);
}
console.log(`nx target conformance: OK (${projects.length} projects checked)`);
