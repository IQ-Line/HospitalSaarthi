import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@pulse/ui/button';
import { Checkbox } from '@pulse/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@pulse/ui/dialog';
import { Input } from '@pulse/ui/input';
import { Skeleton } from '@pulse/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@pulse/ui/table';
import { rowMatchesSearch } from '@/features/master-data/table-search';

export interface PlatformCatalogImportColumn<T> {
  id: string;
  header: string;
  cell: (row: T) => ReactNode;
}

export interface ImportFromPlatformCatalogDialogProps<T> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  searchPlaceholder: string;
  rows: T[];
  isLoading: boolean;
  /** Stable key per row (e.g. `code`, or `from→to` for conversions). */
  getRowKey: (row: T) => string;
  /** First column header (defaults to “Code”). */
  rowKeyHeader?: string;
  /** Keys already present in the tenant catalog (disabled + “Imported”). */
  importedKeys: Set<string>;
  columns: PlatformCatalogImportColumn<T>[];
  /** Fields searched by the modal search box. */
  searchParts: (row: T) => string[];
  isSubmitting: boolean;
  onImportRows: (rows: T[]) => Promise<void>;
  /** Paginate platform library fetch (optional). */
  libraryPagination?: {
    pageIndex: number;
    pageSize: number;
    total: number;
    onPageChange: (pageIndex: number) => void;
  };
  /** Max rows per bulk import request (server limit). */
  maxImportBatch?: number;
}

export function ImportFromPlatformCatalogDialog<T>({
  open,
  onOpenChange,
  title,
  description,
  searchPlaceholder,
  rows,
  isLoading,
  getRowKey,
  rowKeyHeader = 'Code',
  importedKeys,
  columns,
  searchParts,
  isSubmitting,
  onImportRows,
  libraryPagination,
  maxImportBatch = 200,
}: ImportFromPlatformCatalogDialogProps<T>) {
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) {
      setQ('');
      setSelected(new Set());
    }
  }, [open]);

  const filtered = useMemo(
    () => rows.filter((r) => rowMatchesSearch(q, ...searchParts(r))),
    [rows, q, searchParts],
  );

  const importableFiltered = useMemo(
    () => filtered.filter((r) => !importedKeys.has(getRowKey(r))),
    [filtered, importedKeys, getRowKey],
  );

  const selectedImportable = useMemo(
    () => importableFiltered.filter((r) => selected.has(getRowKey(r))),
    [importableFiltered, selected, getRowKey],
  );

  const toggle = (key: string, next: boolean) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (next) n.add(key);
      else n.delete(key);
      return n;
    });
  };

  const selectAllInView = () => {
    setSelected((prev) => {
      const n = new Set(prev);
      for (const r of importableFiltered) {
        n.add(getRowKey(r));
      }
      return n;
    });
  };

  const runImport = async (sel: T[]) => {
    const capped = sel.slice(0, maxImportBatch);
    await onImportRows(capped);
  };

  const clearSelection = () => setSelected(new Set());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(85dvh,900px)] w-full max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
        <div className="shrink-0 space-y-2 p-4 pb-2">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label="Search platform library"
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain border-y px-4 py-2">
          {isLoading ? (
            <div className="space-y-2 py-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead>{rowKeyHeader}</TableHead>
                  {columns.map((c) => (
                    <TableHead key={c.id}>{c.header}</TableHead>
                  ))}
                  <TableHead className="w-[120px]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row) => {
                  const key = getRowKey(row);
                  const done = importedKeys.has(key);
                  const checked = done || selected.has(key);
                  return (
                    <TableRow key={key} className={done ? 'opacity-60' : undefined}>
                      <TableCell>
                        <Checkbox
                          checked={checked}
                          disabled={done || isSubmitting}
                          onCheckedChange={(v) => toggle(key, v === true)}
                          aria-label={`Select ${key}`}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-xs">{key}</TableCell>
                      {columns.map((c) => (
                        <TableCell key={c.id}>{c.cell(row)}</TableCell>
                      ))}
                      <TableCell className="text-xs text-muted-foreground">
                        {done ? '✓ Imported' : ''}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>

        {libraryPagination ? (
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t px-4 py-2 text-xs text-muted-foreground">
            <span>
              Library rows{' '}
              {libraryPagination.total === 0
                ? '0'
                : libraryPagination.pageIndex * libraryPagination.pageSize + 1}
              –
              {Math.min(
                libraryPagination.total,
                (libraryPagination.pageIndex + 1) * libraryPagination.pageSize,
              )}{' '}
              of {libraryPagination.total}
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isSubmitting || libraryPagination.pageIndex <= 0}
                onClick={() => libraryPagination.onPageChange(libraryPagination.pageIndex - 1)}
              >
                Previous page
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={
                  isSubmitting ||
                  (libraryPagination.pageIndex + 1) * libraryPagination.pageSize >= libraryPagination.total
                }
                onClick={() => libraryPagination.onPageChange(libraryPagination.pageIndex + 1)}
              >
                Next page
              </Button>
            </div>
          </div>
        ) : null}

        <p className="shrink-0 px-4 pb-1 text-xs text-muted-foreground">
          Bulk import sends at most {maxImportBatch} platform row UUIDs per request.
        </p>

        <DialogFooter className="mx-0 mb-0 shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={isSubmitting || importableFiltered.length === 0}
              onClick={() => void runImport(importableFiltered)}
            >
              <Download className="size-4" aria-hidden />
              Import all ({importableFiltered.length})
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={selectAllInView}
              disabled={isSubmitting}
            >
              Select all in view
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearSelection}
              disabled={isSubmitting}
            >
              Clear selection
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isSubmitting || selectedImportable.length === 0}
              className="gap-1.5"
              onClick={() => void runImport(selectedImportable)}
            >
              <Download className="size-4" aria-hidden />
              Import{selectedImportable.length ? ` (${selectedImportable.length})` : ' selected'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
