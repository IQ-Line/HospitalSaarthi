import { useModules } from '../api';
import type { Module } from '../types';

function CategoryBadge({ category }: { category: Module['category'] }) {
  const colors: Record<Module['category'], string> = {
    core: 'bg-blue-100 text-blue-800',
    clinical: 'bg-green-100 text-green-800',
    administrative: 'bg-amber-100 text-amber-800',
    support: 'bg-gray-100 text-gray-800',
  };

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colors[category]}`}>
      {category}
    </span>
  );
}

export function ModulesTable() {
  const { data, isLoading, error } = useModules();

  if (isLoading) {
    return <div className="p-6 text-gray-500">Loading modules...</div>;
  }

  if (error) {
    return (
      <div className="p-6 text-red-600">
        Failed to load modules: {error.message}
      </div>
    );
  }

  const modules = data?.data ?? [];

  if (modules.length === 0) {
    return (
      <div className="p-6 text-gray-500">
        No modules registered yet. Use the Master Data API to create one.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Name</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Slug</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Category</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Level</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Version</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {modules.map((m) => (
            <tr key={m.id} className="hover:bg-gray-50">
              <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">{m.name}</td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500 font-mono">{m.slug}</td>
              <td className="whitespace-nowrap px-4 py-3 text-sm"><CategoryBadge category={m.category} /></td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">{m.level}</td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500 font-mono">{m.version}</td>
              <td className="whitespace-nowrap px-4 py-3 text-sm">
                <span className={m.is_active ? 'text-green-600' : 'text-gray-400'}>
                  {m.is_active ? 'Active' : 'Inactive'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
