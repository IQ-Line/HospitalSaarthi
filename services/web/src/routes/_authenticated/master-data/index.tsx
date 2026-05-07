import { createFileRoute } from '@tanstack/react-router';
import { useModules } from '@/features/master-data/api';

export const Route = createFileRoute('/_authenticated/master-data/')({
  component: MasterDataIndexPage,
});

function MasterDataIndexPage() {
  const { data, isLoading, error } = useModules();

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold">Master Data</h2>
      <p className="mt-1 text-sm text-gray-500">
        Platform catalog — modules, permissions, and system role templates.
      </p>

      <div className="mt-6 rounded border border-gray-200 p-4 text-sm">
        <h3 className="font-medium mb-2">Modules (API smoke test)</h3>
        {isLoading && <p className="text-gray-400">Loading...</p>}
        {error && <p className="text-red-600">Error: {error.message}</p>}
        {data && (
          <ul className="space-y-1">
            {data.data.length === 0 && <li className="text-gray-400">No modules registered yet.</li>}
            {data.data.map((m) => (
              <li key={m.id}>{m.name} <span className="text-gray-400">({m.slug})</span></li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
