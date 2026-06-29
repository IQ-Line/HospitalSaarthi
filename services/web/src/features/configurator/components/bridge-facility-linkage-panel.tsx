import { useEffect, useMemo, useState } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@pulse/ui/badge';
import { Button } from '@pulse/ui/button';
import { Card, CardContent } from '@pulse/ui/card';
import { Skeleton } from '@pulse/ui/skeleton';
import { DataTable } from '@/components/data-table';
import { MasterDataTableToolbar } from '@/features/master-data/components/master-data-table-toolbar';
import { useBridgeFacilityLinkage, type BridgeFacilityRow } from '@/features/configurator/api/bridge-linkage';
import { rowMatchesSearch } from '@/features/master-data/table-search';

const ITEMS_PER_PAGE = 10;

function StatusBadge({ active }: { active: boolean }) {
  return (
    <Badge
      className={
        active
          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100'
          : 'bg-muted text-muted-foreground hover:bg-muted'
      }
    >
      {active ? 'Active' : 'Inactive'}
    </Badge>
  );
}

function AbdmLiveBadge({ live }: { live: boolean }) {
  return (
    <Badge
      className={
        live
          ? 'bg-violet-100 text-violet-800 hover:bg-violet-100'
          : 'bg-red-100 text-red-700 hover:bg-red-100'
      }
    >
      {live ? 'Yes' : 'No'}
    </Badge>
  );
}

export function BridgeFacilityLinkagePanel() {
  const { data, isLoading, isError, error } = useBridgeFacilityLinkage();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!isError) return;
    const message =
      error instanceof Error ? error.message : 'Failed to load bridge facility linkage';
    toast.error('Unable to load data', { description: message });
  }, [isError, error]);

  const filteredServices = useMemo(() => {
    const rows = data?.services ?? [];
    const q = search.trim();
    if (!q) return rows;
    return rows.filter((row) =>
      rowMatchesSearch(q, row.id, row.name, row.types.join(' '), row.active ? 'active' : 'inactive'),
    );
  }, [data?.services, search]);

  const totalItems = filteredServices.length;
  const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / ITEMS_PER_PAGE);
  const startIndex = (page - 1) * ITEMS_PER_PAGE;
  const paginatedServices = filteredServices.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const columns = useMemo<ColumnDef<BridgeFacilityRow, unknown>[]>(
    () => [
      {
        id: 'serial',
        header: 'S. No.',
        cell: ({ row }) => startIndex + row.index + 1,
      },
      {
        accessorKey: 'id',
        header: 'Facility ID',
        cell: ({ getValue }) => (
          <code className="text-xs font-mono">{getValue<string>()}</code>
        ),
      },
      {
        accessorKey: 'name',
        header: 'Facility Name',
      },
      {
        accessorKey: 'types',
        header: 'Types',
        cell: ({ getValue }) => {
          const types = getValue<string[]>();
          return (
            <div className="flex flex-wrap gap-1">
              {types.map((type) => (
                <Badge
                  key={type}
                  variant="secondary"
                  className="bg-teal-50 text-teal-700 hover:bg-teal-50"
                >
                  {type}
                </Badge>
              ))}
            </div>
          );
        },
      },
      {
        accessorKey: 'active',
        header: 'Status',
        cell: ({ getValue }) => <StatusBadge active={getValue<boolean>()} />,
      },
      {
        accessorKey: 'abdmLive',
        header: 'ABDM Live',
        cell: ({ getValue }) => <AbdmLiveBadge live={getValue<boolean>()} />,
      },
    ],
    [startIndex],
  );

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const pageNumbers = useMemo(() => {
    if (totalPages <= 0) return [];
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (page <= 3) {
      return [1, 2, 3, 4, 5];
    }
    if (page >= totalPages - 2) {
      return Array.from({ length: 5 }, (_, i) => totalPages - 4 + i);
    }
    return Array.from({ length: 5 }, (_, i) => page - 2 + i);
  }, [page, totalPages]);

  const bridge = data?.bridge ?? null;

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Bridge ID linking access to health facilities
        </p>
        {isLoading ? (
          <Skeleton className="h-20 w-full rounded-lg" />
        ) : bridge ? (
          <Card className="shadow-sm">
            <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
              <div>
                <p className="text-xs text-muted-foreground">Vendor name</p>
                <p className="text-sm font-medium">{bridge.name ?? '—'}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge active={bridge.active ?? false} />
                {bridge.blocklisted ? (
                  <Badge variant="destructive">Blocklisted</Badge>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ) : (
          <p className="text-sm text-muted-foreground">No bridge information returned.</p>
        )}
      </div>

      <div>
        <MasterDataTableToolbar
          value={search}
          onChange={handleSearchChange}
          placeholder="Search by Facility ID, name, or type"
          debounceMs={0}
        />

        <div className="mt-4 rounded-lg border bg-card">
          <DataTable
            columns={columns}
            data={paginatedServices}
            isLoading={isLoading}
            emptyTitle={
              (data?.services.length ?? 0) === 0
                ? 'No facility linkages returned for this Bridge ID.'
                : 'No rows match your search.'
            }
            emptyDescription=""
          />
        </div>

        {!isLoading && totalItems > 0 ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium text-foreground/80">
              {`${startIndex + 1}-${Math.min(startIndex + paginatedServices.length, totalItems)} of ${totalItems.toLocaleString()}`}
            </p>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label="Previous page"
                disabled={page === 1 || totalPages <= 1}
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
              >
                <ChevronLeft className="size-4" />
              </Button>

              {pageNumbers.map((pageNumber) => (
                <Button
                  key={pageNumber}
                  type="button"
                  size="sm"
                  variant={page === pageNumber ? 'default' : 'outline'}
                  className={
                    page === pageNumber
                      ? 'min-w-8 bg-[#0891B2] text-white hover:bg-[#0e7490]'
                      : 'min-w-8'
                  }
                  onClick={() => setPage(pageNumber)}
                >
                  {pageNumber}
                </Button>
              ))}

              {totalPages > 5 && page < totalPages - 2 ? (
                <>
                  <span className="px-1 text-sm text-muted-foreground">…</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="min-w-8"
                    onClick={() => setPage(totalPages)}
                  >
                    {totalPages}
                  </Button>
                </>
              ) : null}

              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label="Next page"
                disabled={page === totalPages || totalPages <= 1}
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
