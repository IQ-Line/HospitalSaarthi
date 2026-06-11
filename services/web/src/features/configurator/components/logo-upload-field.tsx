import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { Button } from '@pulse/ui/button';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from '@pulse/ui/field';

const ACCEPTED_LOGO_TYPES = 'image/png,image/jpeg,image/jpg';
const MAX_LOGO_BYTES = 2 * 1024 * 1024;

export interface LogoUploadFieldProps {
  id: string;
  label: string;
  description?: string;
  file: File | null;
  onFileChange: (file: File | null) => void;
  disabled?: boolean;
}

function validateLogoFile(file: File): string | null {
  const mime = file.type.split(';')[0]?.trim().toLowerCase() ?? '';
  if (!['image/png', 'image/jpeg', 'image/jpg'].includes(mime)) {
    return 'Only PNG and JPEG images are allowed.';
  }
  if (file.size > MAX_LOGO_BYTES) {
    return 'Logo must be 2 MB or smaller.';
  }
  return null;
}

export function LogoUploadField({
  id,
  label,
  description = 'PNG or JPEG, up to 2 MB.',
  file,
  onFileChange,
  disabled = false,
}: LogoUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] ?? null;
    event.target.value = '';
    if (!nextFile) {
      onFileChange(null);
      setError(null);
      return;
    }
    const validationError = validateLogoFile(nextFile);
    if (validationError) {
      setError(validationError);
      onFileChange(null);
      return;
    }
    setError(null);
    onFileChange(nextFile);
  };

  const clearFile = () => {
    onFileChange(null);
    setError(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <Field className="md:col-span-2">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <FieldContent>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted/30">
            {previewUrl ? (
              <img src={previewUrl} alt="" className="h-full w-full object-contain" />
            ) : (
              <ImagePlus className="size-6 text-muted-foreground" aria-hidden />
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() => inputRef.current?.click()}
            >
              {file ? 'Replace logo' : 'Upload logo'}
            </Button>
            {file ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled}
                onClick={clearFile}
                className="gap-1 text-muted-foreground"
              >
                <X className="size-3.5" aria-hidden />
                Remove
              </Button>
            ) : null}
            {file ? (
              <span className="max-w-[16rem] truncate text-xs text-muted-foreground">
                {file.name}
              </span>
            ) : null}
          </div>
        </div>
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept={ACCEPTED_LOGO_TYPES}
          className="sr-only"
          disabled={disabled}
          onChange={handleFileChange}
        />
        <FieldDescription>{description}</FieldDescription>
        {error ? <p className="text-[11px] text-destructive">{error}</p> : null}
      </FieldContent>
    </Field>
  );
}
