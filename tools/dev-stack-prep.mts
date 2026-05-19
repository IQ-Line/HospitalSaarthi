/**
 * Frees canonical dev-stack ports before `pnpm dev:web-stack`.
 * Avoids EADDRINUSE from stale BFF / Vite / uvicorn / Fastify processes.
 */
import { execSync } from "node:child_process";

/** Canonical web-stack listen ports — keep in sync with docs/dev/port-allocation.md */
const DEV_STACK_PORTS = [3000, 3001, 3005, 5173, 5174, 5175, 8010] as const;

function findListeningPids(port: number): number[] {
  if (process.platform === "win32") {
    try {
      const output = execSync("netstat -ano", { encoding: "utf8" });
      const pids = new Set<number>();
      const portPattern = new RegExp(`:${port}\\s+`);
      for (const line of output.split(/\r?\n/)) {
        if (!line.includes("LISTENING") || !portPattern.test(line)) {
          continue;
        }
        const parts = line.trim().split(/\s+/);
        const pid = Number(parts.at(-1));
        if (Number.isInteger(pid) && pid > 0) {
          pids.add(pid);
        }
      }
      return [...pids];
    } catch {
      return [];
    }
  }

  try {
    const output = execSync(`lsof -nP -iTCP:${port} -sTCP:LISTEN -t`, { encoding: "utf8" });
    return output
      .split(/\r?\n/)
      .map((value) => Number(value.trim()))
      .filter((pid) => Number.isInteger(pid) && pid > 0);
  } catch {
    return [];
  }
}

function killPid(pid: number): void {
  if (process.platform === "win32") {
    execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore" });
    return;
  }
  execSync(`kill -9 ${pid}`, { stdio: "ignore" });
}

function freePort(port: number): void {
  const pids = findListeningPids(port);
  if (pids.length === 0) {
    console.log(`[dev-stack-prep] port ${port}: free`);
    return;
  }

  for (const pid of pids) {
    try {
      killPid(pid);
      console.log(`[dev-stack-prep] port ${port}: killed pid ${pid}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[dev-stack-prep] port ${port}: failed to kill pid ${pid} (${message})`);
    }
  }
}

/** uvicorn --reload on Windows can leave python listeners netstat still attributes to dead PIDs. */
function killMasterDataPythonProcesses(port: number): void {
  if (process.platform !== "win32") {
    return;
  }

  const portPattern = `:${port}[^0-9]`;
  const script = [
    "Get-CimInstance Win32_Process",
    "| Where-Object { $_.Name -eq 'python.exe' -and $_.CommandLine -match 'dev_serve|uvicorn|master-data' }",
    `| Where-Object { $_.CommandLine -match '${portPattern}' -or $_.CommandLine -match 'dev_serve' }`,
    "| ForEach-Object { $_.ProcessId }",
  ].join(" ");

  try {
    const output = execSync(`powershell -NoProfile -Command "${script.replace(/"/g, '\\"')}"`, {
      encoding: "utf8",
    });
    const pids = output
      .split(/\r?\n/)
      .map((value) => Number(value.trim()))
      .filter((pid) => Number.isInteger(pid) && pid > 0);

    for (const pid of pids) {
      try {
        killPid(pid);
        console.log(`[dev-stack-prep] master-data python: killed pid ${pid}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`[dev-stack-prep] master-data python: failed pid ${pid} (${message})`);
      }
    }
  } catch {
    // No matching processes — fine.
  }
}

console.log(`[dev-stack-prep] freeing ports: ${DEV_STACK_PORTS.join(", ")}`);
for (const port of DEV_STACK_PORTS) {
  freePort(port);
  if (port === 8010) {
    killMasterDataPythonProcesses(port);
  }
}
console.log("[dev-stack-prep] done — starting nx serve targets");
