/**
 * Controls whether OpenAPI JSON and Swagger UI are registered.
 * - `ENABLE_API_DOCS=true` → always on
 * - `ENABLE_API_DOCS=false` → always off
 * - unset → on when `NODE_ENV` is not `production`, off in production
 */
export function isApiDocsExposureEnabled(): boolean {
  const flag = process.env["ENABLE_API_DOCS"];
  if (flag === "true") return true;
  if (flag === "false") return false;
  return process.env["NODE_ENV"] !== "production";
}
