import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/master-data/')({
  component: MasterDataIndexPage,
});

function MasterDataIndexPage() {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold">Master Data</h2>
      <p className="mt-1 text-sm text-gray-500">
        Platform catalog — modules, permissions, and system role templates.
      </p>
    </div>
  );
}
