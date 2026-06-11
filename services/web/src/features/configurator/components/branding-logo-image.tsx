import { Building2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@pulse/utils';
import {
  brandingLogoQueryOptions,
  type BrandingLogoMetadata,
} from '@/features/configurator/api/branding-logos';

export interface BrandingLogoImageProps {
  logo: BrandingLogoMetadata | null | undefined;
  alt: string;
  className?: string;
  fallbackClassName?: string;
  showFallbackIcon?: boolean;
}

export function BrandingLogoImage({
  logo,
  alt,
  className,
  fallbackClassName,
  showFallbackIcon = true,
}: BrandingLogoImageProps) {
  const storageKey = logo?.storage_key?.trim() ?? '';
  const { data: blob, isLoading, isError } = useQuery({
    ...brandingLogoQueryOptions(storageKey),
    enabled: storageKey.length > 0,
  });

  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!blob) {
      setObjectUrl(null);
      return;
    }
    const url = URL.createObjectURL(blob);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [blob]);

  if (!storageKey) {
    if (!showFallbackIcon) {
      return null;
    }
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-primary/10',
          fallbackClassName,
          className,
        )}
        aria-hidden
      >
        <Building2 className="size-5 text-primary" />
      </div>
    );
  }

  if (isLoading || !objectUrl) {
    return (
      <div
        className={cn('animate-pulse rounded-md bg-muted', className)}
        aria-label={`Loading ${alt}`}
      />
    );
  }

  if (isError) {
    if (!showFallbackIcon) {
      return null;
    }
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-muted',
          fallbackClassName,
          className,
        )}
        aria-hidden
      >
        <Building2 className="size-5 text-muted-foreground" />
      </div>
    );
  }

  return (
    <img
      src={objectUrl}
      alt={alt}
      className={cn('rounded-md object-contain', className)}
    />
  );
}
