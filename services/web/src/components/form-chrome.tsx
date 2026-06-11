import type { ReactNode } from 'react';
import { Label } from '@pulse/ui/label';
import { cn } from '@pulse/utils';

/** Section shell — bordered card with header band. Shared across registration, IPD, etc. */
export function FormSection({
  title,
  children,
  className,
}: {
  title: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('overflow-hidden rounded-md border border-border bg-card', className)}>
      <div className="border-b border-border bg-muted/40 px-4 py-2.5 text-sm font-medium text-foreground">
        {title}
      </div>
      <div className="space-y-3 p-3 md:p-4">{children}</div>
    </section>
  );
}

/** Subsection label with trailing rule. */
export function FormSubsectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 pt-1">
      <span className="shrink-0 text-xs text-muted-foreground">{children}</span>
      <div className="h-px flex-1 bg-border" aria-hidden />
    </div>
  );
}

/** Field label with optional required asterisk. */
export function FormFieldLabel({
  htmlFor,
  required,
  children,
}: {
  htmlFor?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <Label htmlFor={htmlFor} className="text-sm font-normal text-foreground">
      {children}
      {required ? <span className="text-destructive"> *</span> : null}
    </Label>
  );
}

/** Standard vertical field stack. */
export function FormField({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={cn('space-y-1.5', className)}>{children}</div>;
}

/** @deprecated Use FormSection — kept for frontdesk imports during migration. */
export const RegistrationSection = FormSection;
/** @deprecated Use FormSubsectionLabel */
export const RegistrationSubsectionLabel = FormSubsectionLabel;
/** @deprecated Use FormFieldLabel */
export const RegistrationFieldLabel = FormFieldLabel;
/** @deprecated Use FormField */
export const RegistrationField = FormField;
