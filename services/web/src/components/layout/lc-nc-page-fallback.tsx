type LcNcPageFallbackProps = {
  routePath: string;
};

/**
 * Shown when LC/NC is on but no published page-builder page maps to this route.
 * Legacy route components are intentionally not rendered in page-builder-only mode.
 */
export function LcNcPageFallback({ routePath }: LcNcPageFallbackProps) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 p-8 text-center">
      <p className="text-lg font-medium">Page not available</p>
      <p className="max-w-md text-sm text-muted-foreground">
        No published page-builder page is mapped to{' '}
        <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{routePath}</code>.
        Publish and map a page in SMS Studio for this route.
      </p>
    </div>
  );
}
