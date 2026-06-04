import type { ReactNode } from 'react';
import { Label } from '@pulse/ui/label';
import { cn } from '@pulse/utils';

interface RequiredLabelProps {
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}

/** Field label with a red required asterisk. */
export function RequiredLabel({ htmlFor, children, className }: RequiredLabelProps) {
  return (
    <Label htmlFor={htmlFor} className={cn(className)}>
      {children}
      <span className="text-destructive" aria-hidden>
        {' '}
        *
      </span>
    </Label>
  );
}

export const VISITPAD_CODE_HELPER_TEXT =
  'Code must be 3–9 characters: letters, digits, or underscores only. Unique in this catalog; cannot be edited after save.';
