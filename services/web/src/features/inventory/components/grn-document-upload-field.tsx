import { useRef } from 'react';
import { Eye, Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@pulse/ui/button';
import { Label } from '@pulse/ui/label';
import {
  grnDocumentDisplayName,
  GRN_DOCUMENT_ACCEPT,
  validateGrnDocumentFile,
} from '../lib/grn-document-validation';
import { mutationErrorMessage } from '@/lib/mutation-error';
import { useInventoryGrnDocumentView, useInventoryGrnUploadDocument } from '../api/mutations';

export type GrnDocumentKind = 'shipment' | 'voucher';

type GrnDocumentUploadFieldProps = {
  kind: GrnDocumentKind;
  label: string;
  grnId: string | null;
  documentPath: string | null;
  onDocumentPathChange: (path: string | null) => void;
  disabled?: boolean;
  ensureDraftSaved: () => Promise<string | null>;
  apiEnabled: boolean;
};

export function GrnDocumentUploadField({
  kind,
  label,
  grnId,
  documentPath,
  onDocumentPathChange,
  disabled = false,
  ensureDraftSaved,
  apiEnabled,
}: GrnDocumentUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadDocument = useInventoryGrnUploadDocument();
  const viewDocument = useInventoryGrnDocumentView();

  const displayName = grnDocumentDisplayName(documentPath);
  const isBusy = uploadDocument.isPending || viewDocument.isPending;

  const handleFileChange = (file: File | null) => {
    void (async () => {
      if (!file) return;
      const validationError = validateGrnDocumentFile(file);
      if (validationError) {
        toast.error(validationError);
        return;
      }

      if (!apiEnabled) {
        onDocumentPathChange(`mock://${kind}/${file.name}`);
        toast.success(`${label} attached (mock)`);
        return;
      }

      let targetGrnId = grnId;
      if (!targetGrnId) {
        targetGrnId = await ensureDraftSaved();
        if (!targetGrnId) {
          toast.error('Save the GRN draft before uploading documents');
          return;
        }
      }

      try {
        const result = await uploadDocument.mutateAsync({
          grnId: targetGrnId,
          kind,
          file,
        });
        onDocumentPathChange(result.document_path);
        toast.success(`${label} uploaded`);
      } catch (err) {
        toast.error(mutationErrorMessage(err));
      } finally {
        if (inputRef.current) inputRef.current.value = '';
      }
    })();
  };

  const handleView = () => {
    if (!apiEnabled || !grnId || !documentPath) return;
    void (async () => {
      try {
        const blob = await viewDocument.mutateAsync({ grnId, kind });
        const objectUrl = URL.createObjectURL(blob);
        window.open(objectUrl, '_blank', 'noopener,noreferrer');
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
      } catch {
        toast.error(`Could not open ${label.toLowerCase()}`);
      }
    })();
  };

  return (
    <div className="space-y-2">
      <Label>{label} (optional)</Label>
      <input
        ref={inputRef}
        type="file"
        accept={GRN_DOCUMENT_ACCEPT}
        className="hidden"
        disabled={disabled || isBusy}
        onChange={(event) => {
          const file = event.target.files?.[0] ?? null;
          void handleFileChange(file);
        }}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={disabled || isBusy}
          onClick={() => inputRef.current?.click()}
        >
          {uploadDocument.isPending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Upload className="size-4" aria-hidden />
          )}
          {displayName ? 'Replace' : 'Upload'}
        </Button>
        {displayName && apiEnabled && grnId ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-1.5"
            disabled={isBusy}
            onClick={handleView}
          >
            {viewDocument.isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Eye className="size-4" aria-hidden />
            )}
            View
          </Button>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">JPG or PDF, up to 10 MB.</p>
      {displayName ? (
        <p className="text-xs text-foreground" title={documentPath ?? undefined}>
          {displayName}
        </p>
      ) : null}
    </div>
  );
}
