import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@pulse/ui/button';
import { Input } from '@pulse/ui/input';

/** Reference CustomPagination layout (hims-frontend-ai-based). */
export interface PatientsListPaginationProps {
  currentPage: number;
  entriesCount: number;
  onPageChange: (page: number) => void;
  rowPerPage: number;
}

export function PatientsListPagination({
  currentPage,
  entriesCount,
  onPageChange,
  rowPerPage,
}: PatientsListPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(entriesCount / rowPerPage));
  const startEntry = entriesCount === 0 ? 0 : (currentPage - 1) * rowPerPage + 1;
  const endEntry = entriesCount === 0 ? 0 : Math.min(startEntry + rowPerPage - 1, entriesCount);

  const handlePageInput = (raw: string) => {
    const page = Number.parseInt(raw, 10);
    if (!Number.isNaN(page) && page >= 1 && page <= totalPages) {
      onPageChange(page);
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card px-4 py-3 shadow-sm md:flex-row md:items-center md:justify-between">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 rounded-full"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
            aria-label="Previous page"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 rounded-full"
            disabled={currentPage >= totalPages || entriesCount === 0}
            onClick={() => onPageChange(currentPage + 1)}
            aria-label="Next page"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Page</span>
          <Input
            type="number"
            min={1}
            max={totalPages}
            value={currentPage}
            onChange={(e) => handlePageInput(e.target.value)}
            className="h-8 w-[72px] rounded-full text-center tabular-nums"
            aria-label="Current page"
          />
          <span>of {totalPages}</span>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        {entriesCount === 0 ? 'No entries' : `Showing ${startEntry}-${endEntry} of ${entriesCount}`}
      </p>
    </div>
  );
}
