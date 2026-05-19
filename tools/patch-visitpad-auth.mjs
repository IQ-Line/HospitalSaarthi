import fs from 'node:fs';
import path from 'node:path';

const dir = path.join(process.cwd(), 'services/web/src/routes/_authenticated/visitpad');
const newImports = `import { useAnyCapability, useCapability } from '@/hooks/use-capability';
import { MD_VISITPAD_MUTATE_ANY, MD_VISITPAD_VIEW } from '@/lib/runtime-capability-keys';
`;

for (const name of fs.readdirSync(dir)) {
  if (!name.endsWith('.tsx') || name === 'index.tsx') continue;
  const file = path.join(dir, name);
  let c = fs.readFileSync(file, 'utf8');
  if (!c.includes('useVisitpadCatalogCapabilities')) continue;

  c = c.replace(
    /import \{ useVisitpadCatalogCapabilities \} from '@\/features\/visitpad\/hooks\/use-visitpad-catalog-capabilities';\r?\n/,
    newImports,
  );
  c = c.replace(
    /const \{ canWrite, canRead \} = useVisitpadCatalogCapabilities\(\);/g,
    'const visitpadView = useCapability(MD_VISITPAD_VIEW);\n  const visitpadMutate = useAnyCapability(MD_VISITPAD_MUTATE_ANY);',
  );
  c = c.replace(/!canWrite/g, '!visitpadMutate');
  c = c.replace(/\bcanWrite\b/g, 'visitpadMutate');
  c = c.replace(/\bcanRead\b/g, 'visitpadView');
  c = c.replace(/\s*visitpadMutate=\{visitpadMutate\}\s*\n?/g, '\n');
  c = c.replace(/\s*visitpadView=\{visitpadView\}\s*\n?/g, '\n');

  fs.writeFileSync(file, c);
  console.log('patched', name);
}

const hdr = path.join(
  process.cwd(),
  'services/web/src/features/visitpad/components/visitpad-header-actions.tsx',
);
let h = fs.readFileSync(hdr, 'utf8');
h = h.split('<motion.div').join('<motion.div').split('</motion.div>').join('</motion.div>');
fs.writeFileSync(hdr, h);
