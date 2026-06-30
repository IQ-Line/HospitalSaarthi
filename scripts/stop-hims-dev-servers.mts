/**
 * Kill HIMS app servers listening on canonical dev ports (vite, bff, svc, …).
 * Used by `pnpm stop` and auto-run at the start of `pnpm start`.
 */
import { execSync } from 'node:child_process';
import { HIMS_APP_PORTS, HIMS_PORT_LABELS } from './dev-stack-ports.mts';

const isWin = process.platform === 'win32';

function pidsOnPort(port: number): number[] {
  const pids = new Set<number>();
  try {
    if (isWin) {
      const out = execSync(`netstat -ano -p tcp | findstr :${port}`, {
        encoding: 'utf8',
        windowsHide: true,
      });
      for (const line of out.split(/\r?\n/)) {
        if (!/LISTENING/i.test(line)) continue;
        const parts = line.trim().split(/\s+/);
        const pid = Number(parts[parts.length - 1]);
        if (Number.isFinite(pid) && pid > 0) pids.add(pid);
      }
    } else {
      const out = execSync(`lsof -nP -iTCP:${port} -sTCP:LISTEN -t`, { encoding: 'utf8' });
      for (const line of out.split(/\r?\n/)) {
        const pid = Number(line.trim());
        if (Number.isFinite(pid) && pid > 0) pids.add(pid);
      }
    }
  } catch {
    // port free
  }
  return [...pids];
}

function killPidTree(pid: number): boolean {
  try {
    execSync(isWin ? `taskkill /F /T /PID ${pid}` : `kill -9 ${pid}`, {
      stdio: 'ignore',
      windowsHide: true,
    });
    return true;
  } catch {
    return false;
  }
}

export type StopHimsDevServersResult = {
  killed: number;
  details: string[];
};

/** Stop all listeners on HIMS app ports. Returns count of processes killed. */
export function stopHimsDevServers(): StopHimsDevServersResult {
  const killedPids = new Set<number>();
  const details: string[] = [];

  for (const port of HIMS_APP_PORTS) {
    const label = HIMS_PORT_LABELS[port] ? `${port} (${HIMS_PORT_LABELS[port]})` : String(port);
    for (const pid of pidsOnPort(port)) {
      if (killedPids.has(pid)) continue;
      if (killPidTree(pid)) {
        killedPids.add(pid);
        details.push(`freed ${label} — killed PID ${pid}`);
      }
    }
  }

  return { killed: killedPids.size, details };
}
