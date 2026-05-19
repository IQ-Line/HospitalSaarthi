/**
 * Dev/offline fallback: infer tenant module slugs from held capability key prefixes.
 */
const PREFIX_TO_MODULE: readonly { prefix: string; slug: string }[] = [
  { prefix: 'um:', slug: 'user-management' },
  { prefix: 'md:', slug: 'master-data' },
  { prefix: 'cfg:', slug: 'configurator' },
  { prefix: 'fd:', slug: 'frontdesk' },
] as const;

export function inferModuleSlugsFromCapabilityKeys(
  capabilityKeys: ReadonlySet<string>,
): ReadonlySet<string> {
  const slugs = new Set<string>();
  for (const key of capabilityKeys) {
    for (const { prefix, slug } of PREFIX_TO_MODULE) {
      if (key.startsWith(prefix)) {
        slugs.add(slug);
        if (prefix === 'md:' && key.includes('visitpad')) {
          slugs.add('visitpad-templates');
        }
        break;
      }
    }
  }
  return slugs;
}
