// Generates the pdf-platform report-client TypeScript types from the vendored
// JSON-Schema contract, one file per definition. See ADR-0036 / the pdf-platform
// consolidation plan. Run via `make gen-report-contracts` (never by hand-editing
// the generated output).
//
// One-file-per-type is deliberate: each report definition inlines its own
// `Patient`/`Facility`/`Visit`/`Doctor` interfaces, and json-schema-to-typescript
// names them identically across reports. Isolating each root type in its own
// module keeps those nested names from colliding.
import { readFileSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compile } from 'json-schema-to-typescript';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SCHEMA_PATH = join(REPO_ROOT, 'contracts/pdf-platform/report-contracts.schema.json');
const OUT_DIR = join(REPO_ROOT, 'packages/pdf-client/src/generated');

const BANNER =
  '// AUTO-GENERATED from contracts/pdf-platform/report-contracts.schema.json — DO NOT EDIT. Run `make gen-report-contracts`.';

type Bundle = {
  reportTypes: Record<string, string>;
  definitions: Record<string, Record<string, unknown>>;
};

function kebab(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
}

const bundle = JSON.parse(readFileSync(SCHEMA_PATH, 'utf8')) as Bundle;

// Reset the output dir so a removed definition can never leave a stale file
// behind (which would slip past the drift-gate as an untracked leftover).
rmSync(OUT_DIR, { recursive: true, force: true });
mkdirSync(OUT_DIR, { recursive: true });

const typeNames = Object.keys(bundle.definitions);

for (const typeName of typeNames) {
  const schema = bundle.definitions[typeName];
  const body = await compile(schema, typeName, {
    bannerComment: '',
    additionalProperties: false,
    // Deterministic output: no timestamps, no $refs to resolve over the network.
    declareExternallyReferenced: true,
    enableConstEnums: false,
  });
  const file = join(OUT_DIR, `${kebab(typeName)}.ts`);
  writeFileSync(file, `${BANNER}\n\n${body}`);
}

// index.ts: re-export ONLY the root type from each file (never `export *` — that
// would surface the colliding nested `Patient`/`Facility`/… interface names).
const indexLines = typeNames
  .map((t) => `export type { ${t} } from './${kebab(t)}.js';`)
  .join('\n');
writeFileSync(join(OUT_DIR, 'index.ts'), `${BANNER}\n\n${indexLines}\n`);

// report-slugs.ts: typed slug → type-name map, for later endpoint wiring.
const slugEntries = Object.entries(bundle.reportTypes)
  .map(([slug, typeName]) => `  '${slug}': '${typeName}',`)
  .join('\n');
writeFileSync(
  join(OUT_DIR, 'report-slugs.ts'),
  `${BANNER}\n\nexport const REPORT_SLUG_TO_TYPE = {\n${slugEntries}\n} as const;\n`,
);

console.log(`gen-report-contracts: wrote ${typeNames.length} type file(s) + index + slugs to ${OUT_DIR}`);
