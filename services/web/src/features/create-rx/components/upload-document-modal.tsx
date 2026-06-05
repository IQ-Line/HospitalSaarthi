import { Loader2 } from 'lucide-react';
import { Button } from '@pulse/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@pulse/ui/dialog';
import { Input } from '@pulse/ui/input';
import { Label } from '@pulse/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@pulse/ui/select';
import { HEALTH_DOCUMENT_HI_TYPES } from '../api/health-documents';

const ACCEPTED_FILE_TYPES =
  'application/pdf,image/jpeg,image/jpg,image/png';

interface UploadDocumentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedHiType: string;
  onSelectedHiTypeChange: (value: string) => void;
  documentTitle: string;
  onDocumentTitleChange: (value: string) => void;
  file: File | null;
  onFileChange: (file: File | null) => void;
  onUpload: () => void;
  uploading?: boolean;
}

export function UploadDocumentModal({
  open,
  onOpenChange,
  selectedHiType,
  onSelectedHiTypeChange,
  documentTitle,
  onDocumentTitleChange,
  file,
  onFileChange,
  onUpload,
  uploading = false,
}: UploadDocumentModalProps) {
  const canUpload =
    Boolean(file) &&
    selectedHiType.trim().length > 0 &&
    documentTitle.trim().length > 0 &&
    !uploading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload document</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            PDF, JPEG, or PNG up to 10 MB.
          </p>

          <div className="space-y-2">
            <Label htmlFor="hi-type">Health information (HI) type</Label>
            <Select value={selectedHiType} onValueChange={onSelectedHiTypeChange}>
              <SelectTrigger id="hi-type" className="w-full border-[#CBD5E1]">
                <SelectValue placeholder="Select HI type" />
              </SelectTrigger>
              <SelectContent>
                {HEALTH_DOCUMENT_HI_TYPES.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="document-file">Document file</Label>
            <Input
              id="document-file"
              type="file"
              accept={ACCEPTED_FILE_TYPES}
              onChange={(event) => {
                const next = event.target.files?.[0] ?? null;
                onFileChange(next);
              }}
            />
            {file ? (
              <p className="text-sm text-muted-foreground">Selected: {file.name}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="document-title">Document title</Label>
            <Input
              id="document-title"
              placeholder="Enter document title"
              value={documentTitle}
              onChange={(event) => onDocumentTitleChange(event.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={uploading}
          >
            Cancel
          </Button>
          <Button type="button" onClick={onUpload} disabled={!canUpload}>
            {uploading ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Uploading…
              </>
            ) : (
              'Upload'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
