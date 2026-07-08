import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import SwaggerParser from "@apidevtools/swagger-parser";

export type OpenApiBundle = Awaited<ReturnType<typeof loadUserManagementOpenApiBundle>>;

function resolveSpecPath(): string {
  // this file: services/user-management-svc/src/openapi/*.ts → repo root = four parents
  return join(
    dirname(fileURLToPath(import.meta.url)),
    "..",
    "..",
    "..",
    "..",
    "specs",
    "openapi",
    "user-management.v1.yaml",
  );
}

/**
 * Dereferenced OpenAPI document (JSON Schema compatible fragments for Fastify / Ajv).
 */
export async function loadUserManagementOpenApiBundle(): Promise<Record<string, unknown>> {
  const specPath = resolveSpecPath();
  await SwaggerParser.validate(specPath);
  const bundle = (await SwaggerParser.dereference(specPath)) as Record<string, unknown>;
  return bundle;
}

/** For tools that only need raw YAML path (validate-spec coherence). */
export function userManagementOpenApiSpecPath(): string {
  return resolveSpecPath();
}

export async function readUserManagementOpenApiYaml(): Promise<string> {
  // eslint-disable-next-line security/detect-non-literal-fs-filename -- path derived from module location, not user input
  return readFile(resolveSpecPath(), "utf8");
}
