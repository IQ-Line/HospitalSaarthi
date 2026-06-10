export type RouteAuthMode = "public" | "protected";

/** UM routes default to protected when `authMode` is omitted. */
export function resolveRouteAuthMode(config: unknown): RouteAuthMode {
  if (config == null || typeof config !== "object") {
    return "protected";
  }
  return (config as { authMode?: RouteAuthMode }).authMode === "public" ? "public" : "protected";
}
