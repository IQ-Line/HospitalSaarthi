import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useCreateRxStore } from '../create-rx.store';

/** Reference DocumentsTab — dashed Add New File card in a grid. */
export function DocumentsTab() {
  const isReadOnly = useCreateRxStore((s) => s.isReadOnly);

  return (
    <div className="grid grid-cols-1 gap-6 p-4 sm:grid-cols-2 lg:grid-cols-3">
      <button
        type="button"
        disabled={isReadOnly}
        onClick={() => toast.info('Document upload will connect when documents API is wired')}
        className="flex min-h-[160px] flex-col items-center justify-center rounded-lg border-2 border-dashed border-[#CBD5E0] bg-white p-4 shadow-md transition-colors hover:border-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Plus className="mb-2 size-10 text-gray-400" />
        <span className="font-semibold text-blue-500">
          {isReadOnly ? 'Consultation ended and visit closed.' : 'Add New File'}
        </span>
      </button>
    </div>
  );
}
