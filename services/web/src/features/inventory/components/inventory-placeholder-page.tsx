import { InventoryPageShell } from './inventory-page-shell';

interface InventoryPlaceholderPageProps {
  title: string;
  description?: string;
}

export function InventoryPlaceholderPage({ title, description }: InventoryPlaceholderPageProps) {
  return (
    <InventoryPageShell
      title={title}
      breadcrumbLabel={title}
      description={description ?? 'This screen will be wired when inventory APIs are available.'}
    >
      <div className="rounded-lg border border-dashed bg-muted/20 p-8 text-center text-sm text-muted-foreground">
        {title} UI placeholder — connect operational inventory APIs to enable this workflow.
      </div>
    </InventoryPageShell>
  );
}
