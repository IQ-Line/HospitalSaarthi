import { Download, Printer } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@pulse/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@pulse/ui/dialog';
import { ApiError } from '@/lib/api-client';

export interface DocumentPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  queryKey: readonly unknown[];
  fetchPdf: () => Promise<Blob>;
  downloadFilename?: string;
}

export function DocumentPreviewModal({
  open,
  onOpenChange,
  title,
  description,
  queryKey,
  fetchPdf,
  downloadFilename = 'document.pdf',
}: DocumentPreviewModalProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const pdfQuery = useQuery({
    queryKey,
    queryFn: fetchPdf,
    enabled: open,
    staleTime: 0,
    retry: 1,
  });

  const blobUrl = useMemo(() => {
    if (!pdfQuery.data) return null;
    return URL.createObjectURL(pdfQuery.data);
  }, [pdfQuery.data]);

  useEffect(() => {
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [blobUrl]);

  const errorMessage =
    pdfQuery.error instanceof ApiError
      ? pdfQuery.error.body || pdfQuery.error.message
      : pdfQuery.error instanceof Error
        ? pdfQuery.error.message
        : 'Could not load document';

  const handlePrint = () => {
    const frame = iframeRef.current;
    if (frame?.contentWindow) {
      frame.contentWindow.focus();
      frame.contentWindow.print();
      return;
    }
    if (blobUrl) {
      window.open(blobUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleDownload = () => {
    if (!blobUrl) return;
    const anchor = document.createElement('a');
    anchor.href = blobUrl;
    anchor.download = downloadFilename;
    anchor.click();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(90dvh,900px)] w-full max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>

        <div className="min-h-[min(60dvh,640px)] flex-1 bg-muted/30 p-2">
          {pdfQuery.isPending ? (
            <p className="p-6 text-sm text-muted-foreground">Loading document…</p>
          ) : null}
          {pdfQuery.isError ? (
            <p className="p-6 text-sm text-destructive" role="alert">
              {errorMessage}
            </p>
          ) : null}
          {blobUrl ? (
            <iframe
              ref={iframeRef}
              title={title}
              src={blobUrl}
              className="h-[min(60dvh,640px)] w-full rounded-md border bg-white"
            />
          ) : null}
        </div>

        <DialogFooter className="gap-2 border-t px-6 py-4 sm:justify-between">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              disabled={!blobUrl}
              onClick={handlePrint}
            >
              <Printer className="size-4" />
              Print
            </Button>
            <Button
              type="button"
              className="gap-2"
              disabled={!blobUrl}
              onClick={handleDownload}
            >
              <Download className="size-4" />
              Download
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
