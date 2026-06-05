import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PARTNER_EXPOSED_OPERATIONS } from "../../modules/integration-hub/src/control-plane/domain/partner-exposed-operations.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

type OperationContract = {
  method: string;
  path: string;
};

const SPEC_FILES: Record<string, string> = {
  registration: "registration.v1.yaml",
  empi: "empi.v1.yaml",
};

function readGitFile(ref: string, relativePath: string): string | null {
  try {
    return execSync(`git show ${ref}:${relativePath}`, {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return null;
  }
}

function extractOperationsFromYaml(content: string): Map<string, OperationContract> {
  const operations = new Map<string, OperationContract>();
  let currentPath = "";
  let currentMethod = "";

  for (const line of content.split("\n")) {
    const pathMatch = line.match(/^  (\/[^\s:]+):\s*$/);
    if (pathMatch) {
      currentPath = pathMatch[1] ?? "";
      currentMethod = "";
      continue;
    }

    const methodMatch = line.match(/^    (get|post|put|patch|delete|head|options):\s*$/i);
    if (methodMatch && currentPath) {
      currentMethod = methodMatch[1]!.toLowerCase();
      continue;
    }

    const operationIdMatch = line.match(/^\s+operationId:\s*(\S+)\s*$/);
    if (operationIdMatch && currentPath && currentMethod) {
      operations.set(operationIdMatch[1]!, {
        method: currentMethod,
        path: currentPath,
      });
      currentMethod = "";
    }
  }

  return operations;
}

function loadCurrentRegistryRefs(): string[] {
  return PARTNER_EXPOSED_OPERATIONS.map((entry) => entry.ref);
}

function loadBaselineRegistryRefs(): string[] | null {
  const baseline = readGitFile(
    "main",
    "modules/integration-hub/src/control-plane/domain/partner-exposed-operations.ts",
  );
  if (!baseline) return null;

  const refs: string[] = [];
  const refPattern = /ref:\s*"([^"]+)"/g;
  for (const match of baseline.matchAll(refPattern)) {
    refs.push(match[1]!);
  }
  return refs;
}

function contractKey(contract: OperationContract): string {
  return `${contract.method.toUpperCase()} ${contract.path}`;
}

function main(): void {
  const errors: string[] = [];
  const currentRegistry = loadCurrentRegistryRefs();
  const baselineRegistry = loadBaselineRegistryRefs();

  if (baselineRegistry) {
    for (const ref of baselineRegistry) {
      if (!currentRegistry.includes(ref)) {
        errors.push(`Partner registry removed immutable operation ref: ${ref}`);
      }
    }
  }

  for (const entry of PARTNER_EXPOSED_OPERATIONS) {
    const specFile = SPEC_FILES[entry.spec];
    if (!specFile) {
      errors.push(`Unknown spec '${entry.spec}' for operation ${entry.ref}`);
      continue;
    }

    const relativeSpecPath = `specs/openapi/${specFile}`;
    const currentSpecPath = path.join(repoRoot, relativeSpecPath);
    const currentYaml = readFileSync(currentSpecPath, "utf8");
    const currentOps = extractOperationsFromYaml(currentYaml);
    const currentContract = currentOps.get(entry.operationId);

    if (!currentContract) {
      errors.push(
        `operationId '${entry.operationId}' missing from current OpenAPI spec ${relativeSpecPath}`,
      );
      continue;
    }

    const baselineYaml = readGitFile("main", relativeSpecPath);
    if (!baselineYaml) continue;

    const baselineOps = extractOperationsFromYaml(baselineYaml);
    const baselineContract = baselineOps.get(entry.operationId);
    if (!baselineContract) continue;

    if (contractKey(currentContract) !== contractKey(baselineContract)) {
      errors.push(
        `Breaking change for ${entry.ref}: was ${contractKey(baselineContract)}, now ${contractKey(currentContract)}`,
      );
    }
  }

  if (errors.length > 0) {
    console.error("Partner operationId immutability check failed:");
    for (const error of errors) {
      console.error(`  - ${error}`);
    }
    process.exit(1);
  }

  console.log(
    `Partner operationId immutability check passed (${PARTNER_EXPOSED_OPERATIONS.length} operations).`,
  );
}

main();
