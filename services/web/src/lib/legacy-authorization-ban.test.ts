import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const webSrc = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const SKIP_SEGMENTS = new Set(['node_modules', 'dist', '.git']);
const SKIP_FILES = new Set(['legacy-authorization-ban.test.ts']);

const BANNED: Array<{ label: string; re: RegExp }> = [
  { label: 'hasFeaturePermission', re: /\bhasFeaturePermission\b/ },
  { label: 'permissions-map module', re: /permissions-map/ },
  { label: 'um-permissions helper', re: /um-permissions/ },
  { label: 'users.write tuple', re: /users\.write/ },
  { label: 'roles.read tuple', re: /roles\.read/ },
  { label: 'visitpadView abstraction', re: /\bvisitpadView\b/ },
  { label: 'visitpadMutate abstraction', re: /\bvisitpadMutate\b/ },
  { label: 'KNOWN_MODULE_ID_TO_SLUG', re: /KNOWN_MODULE_ID_TO_SLUG/ },
  { label: 'dev-capability-keys', re: /dev-capability-keys/ },
  { label: 'DEV_SUPERADMIN_CAPABILITY_KEYS', re: /DEV_SUPERADMIN_CAPABILITY_KEYS/ },
  { label: 'dev-token bypass', re: /dev-token/ },
  { label: 'buildDevPermissionMap', re: /buildDevPermissionMap/ },
  { label: 'inferModuleSlugsFromCapabilityKeys', re: /inferModuleSlugsFromCapabilityKeys/ },
  { label: 'buildUxPermissionMap', re: /buildUxPermissionMap/ },
  { label: 'canManageAccess', re: /\bcanManageAccess\b/ },
  { label: 'canReadRoles', re: /\bcanReadRoles\b/ },
  { label: 'canWriteRoles', re: /\bcanWriteRoles\b/ },
  { label: 'canReadRoleCapabilities', re: /\bcanReadRoleCapabilities\b/ },
];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_SEGMENTS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
    } else if (
      (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) &&
      !SKIP_FILES.has(entry.name) &&
      !entry.name.endsWith('.test.ts') &&
      !entry.name.endsWith('.test.tsx')
    ) {
      out.push(full);
    }
  }
  return out;
}

function scanSources(): Map<string, string[]> {
  const hits = new Map<string, string[]>();
  for (const file of walk(webSrc)) {
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
    for (const { label, re } of BANNED) {
      const matched = lines.some((line) => re.test(line));
      if (matched) {
        const list = hits.get(label) ?? [];
        list.push(path.relative(webSrc, file));
        hits.set(label, list);
      }
    }
  }
  return hits;
}

describe('legacy authorization APIs are absent from services/web', () => {
  const hits = scanSources();

  for (const { label } of BANNED) {
    it(`does not reference ${label}`, () => {
      const files = hits.get(label) ?? [];
      expect(files, files.length ? `Found in:\n${files.join('\n')}` : undefined).toEqual([]);
    });
  }
});
