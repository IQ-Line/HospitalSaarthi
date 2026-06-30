#!/usr/bin/env tsx
/**
 * Stop local HIMS app servers (vite, bff, svc processes on canonical dev ports).
 * Does not stop Docker (Cerbos/Postgres) — use: docker compose -f infra/docker/docker-compose.yml down
 */
import { stopHimsDevServers } from './stop-hims-dev-servers.mts';

console.log('Stopping HIMS dev servers on app ports…');
const { killed, details } = stopHimsDevServers();
for (const line of details) {
  console.log(`  ${line}`);
}
if (killed === 0) {
  console.log('No HIMS app servers were listening (ports already free).');
} else {
  console.log(`Done — stopped ${killed} process(es).`);
}
