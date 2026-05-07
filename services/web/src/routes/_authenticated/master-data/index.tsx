import { createFileRoute } from '@tanstack/react-router';
import { ModulesTable } from '@/features/master-data/components/modules-table';

export const Route = createFileRoute('/_authenticated/master-data/')({
  component: MasterDataIndexPage,
});

function MasterDataIndexPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold">Master Data</h2>
        <p className="mt-1 text-sm text-gray-500">
          Platform catalog — modules, permissions, and system role templates.
        </p>
      </div>

      <section>
        <h3 className="text-lg font-medium mb-3">Modules</h3>
        <div className="rounded-lg border border-gray-200">
          <ModulesTable />
        </div>
      </section>
    </div>
  );
}
