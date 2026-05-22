import type { ReactNode } from 'react';
import { Search } from 'lucide-react';
import { Button } from '@pulse/ui/button';
import { Input } from '@pulse/ui/input';
import { Label } from '@pulse/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@pulse/ui/tabs';
import { cn } from '@pulse/utils';

/** Section shell matching registration mock — cyan header band + white body. */
export function RegistrationSection({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('overflow-hidden rounded-md border border-border bg-card', className)}>
      <div className="border-b border-[#c5e4f5] bg-[#eaf6fc] px-4 py-2.5 text-sm font-medium text-foreground">
        {title}
      </div>
      <div className="space-y-4 p-4">{children}</div>
    </section>
  );
}

/** Small gray subsection label inside a section (e.g. "Patient Details", "Address"). */
export function RegistrationSubsectionLabel({ children }: { children: ReactNode }) {
  return <p className="text-xs text-muted-foreground">{children}</p>;
}

/** Field label with optional required asterisk. */
export function RegistrationFieldLabel({
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

/** Standard vertical field stack used across registration grids. */
export function RegistrationField({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={cn('space-y-1.5', className)}>{children}</div>;
}

type RegistrationFormHeaderProps = {
  searchValue: string;
  onSearchChange: (value: string) => void;
  onPatientQueue: () => void;
  activeTab?: string;
  actions?: ReactNode;
};

/**
 * Top chrome: title, queue/token chips, search, OPD Visit tab.
 * Uses @pulse/ui Button, Input, Tabs.
 */
export function RegistrationFormHeader({
  searchValue,
  onSearchChange,
  onPatientQueue,
  activeTab = 'opd-visit',
  actions,
}: RegistrationFormHeaderProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Registration</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-9 rounded-full bg-muted px-4 text-foreground shadow-none"
            onClick={onPatientQueue}
          >
            Patient Queue
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 rounded-full px-4"
            disabled
          >
            Token
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 rounded-full px-4"
            disabled
          >
            ABHA Token
          </Button>
          <div className="relative min-w-[12rem] flex-1 sm:min-w-[16rem] sm:max-w-xs">
            <Label htmlFor="reg-header-search" className="sr-only">
              Search by name or mobile
            </Label>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="reg-header-search"
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search by Name, Mobile (10 dig"
              className="h-9 pl-9"
              autoComplete="off"
            />
          </div>
          {actions}
        </div>
      </div>
      <Tabs value={activeTab}>
        <TabsList
          variant="line"
          className="h-auto w-full justify-start rounded-none border-b border-border bg-transparent p-0"
        >
          <TabsTrigger
            value="opd-visit"
            className="rounded-none border-0 border-b-2 border-transparent bg-transparent px-0 pb-2 pt-0 text-sm font-medium text-muted-foreground shadow-none data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none"
          >
            OPD Visit
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}
