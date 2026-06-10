import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { cn } from '@pulse/utils';

export interface PrintableReportTemplateProps {
  html: string;
  /** Fixed viewport height (e.g. `80vh`). Omit when the parent flex layout should fill available space. */
  height?: string;
  className?: string;
  iframeRef?: RefObject<HTMLIFrameElement | null>;
}

const A4_WIDTH_PX = 794;
const A4_HEIGHT_PX = 1123;

/**
 * Renders report HTML in an iframe so modal preview matches the exact same HTML used for printing.
 * Mirrors hims-frontend PrintableReportTemplate (A4 column, content-height iframe).
 */
export function PrintableReportTemplate({
  html,
  height,
  className,
  iframeRef: externalIframeRef,
}: PrintableReportTemplateProps) {
  const localIframeRef = useRef<HTMLIFrameElement>(null);
  const iframeRef = externalIframeRef ?? localIframeRef;
  const [contentHeight, setContentHeight] = useState(A4_HEIGHT_PX);

  const measureIframeContent = useCallback((iframe: HTMLIFrameElement | null) => {
    const doc = iframe?.contentDocument;
    if (!doc) return;

    const root =
      doc.body?.querySelector('.report-print-root') ??
      doc.body?.firstElementChild ??
      doc.body;

    const fullHeight = root
      ? Math.max(root.scrollHeight, root.clientHeight, A4_HEIGHT_PX)
      : Math.max(
          doc.documentElement?.scrollHeight ?? 0,
          doc.body?.scrollHeight ?? 0,
          A4_HEIGHT_PX,
        );

    setContentHeight(fullHeight);
  }, []);

  const onIframeLoad = useCallback(
    (event: React.SyntheticEvent<HTMLIFrameElement>) => {
      const iframe = event.currentTarget;

      const scheduleMeasure = () => measureIframeContent(iframe);

      requestAnimationFrame(() => {
        scheduleMeasure();
        window.setTimeout(scheduleMeasure, 100);
        window.setTimeout(scheduleMeasure, 400);
      });
    },
    [measureIframeContent],
  );

  useEffect(() => {
    setContentHeight(A4_HEIGHT_PX);
  }, [html]);

  useEffect(() => {
    const iframe = iframeRef.current;
    const doc = iframe?.contentDocument;
    const root =
      doc?.body?.querySelector('.report-print-root') ??
      doc?.body?.firstElementChild ??
      doc?.body;

    if (!root || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(() => measureIframeContent(iframe));
    observer.observe(root);
    return () => observer.disconnect();
  }, [html, iframeRef, measureIframeContent]);

  return (
    <div
      className={cn(
        'flex w-full min-h-0 items-start justify-center overflow-auto bg-neutral-400 p-6 [scrollbar-color:rgb(115_115_115)_rgb(229_229_229)] [scrollbar-width:thin]',
        className,
      )}
      style={height ? { height } : undefined}
    >
      <div
        className="shrink-0 bg-white shadow-[0_2px_10px_rgba(0,0,0,0.25)]"
        style={{ width: `${A4_WIDTH_PX}px`, minHeight: `${A4_HEIGHT_PX}px` }}
      >
        <iframe
          ref={iframeRef}
          title="report-preview"
          srcDoc={html}
          onLoad={onIframeLoad}
          className="block border-0"
          style={{ width: `${A4_WIDTH_PX}px`, height: `${contentHeight}px` }}
        />
      </div>
    </div>
  );
}
