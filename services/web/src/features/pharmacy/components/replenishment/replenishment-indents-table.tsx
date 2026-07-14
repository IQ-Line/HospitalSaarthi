import { useMemo, useState } from 'react';
import { Minus, Plus, Search } from 'lucide-react';
import { Badge } from '@pulse/ui/badge';
import { Button } from '@pulse/ui/button';
import { Input } from '@pulse/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@pulse/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@pulse/ui/table';
import { Skeleton } from '@pulse/ui/skeleton';
import {
  formatIndentRequestDate,
  indentPriorityLabel,
  indentStatusBadgeClass,
  indentStatusLabel,
  INDENT_STATUS_FILTER_OPTIONS,
} from '../../lib/replenishment-display';
import type { IndentRequestRow } from '../../types/replenishment-ui.types';

type ReplenishmentIndentsTableProps = {
  rows: IndentRequestRow[];
  isLoading: boolean;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
};

function IndentLinesSubRow({ lines }: { lines: IndentRequestRow['lines'] }) {
  if (lines.length === 0) {
    return (
      <TableRow className="bg-muted/20 hover:bg-muted/20">
        <TableCell colSpan={7} className="py-3 text-sm text-muted-foreground">
          No items on this indent.
        </TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow className="bg-muted/20 hover:bg-muted/20">
      <TableCell colSpan={7} className="p-0">
        <div className="border-t px-4 py-2 text-xs text-muted-foreground">
          {lines.length} line(s) on this indent.
        </div>
      </TableCell>
    </TableRow>
  );
}

export function ReplenishmentIndentsTable({
  rows,
  isLoading,
  statusFilter,
  onStatusFilterChange,
  search,
  onSearchChange,
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: ReplenishmentIndentsTableProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const rowOffset = (page - 1) * pageSize;

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toolbar = (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative w-full sm:max-w-[260px]">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search indent #"
          className="h-9 pl-9"
        />
      </div>
      <Select value={statusFilter} onValueChange={onStatusFilterChange}>
        <SelectTrigger className="h-9 w-full sm:w-[180px]">
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          {INDENT_STATUS_FILTER_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  const tableBody = useMemo(() => {
    if (isLoading) {
      return Array.from({ length: 3 }).map((_, i) => (
        <TableRow key={`sk-${String(i)}`}>
          {Array.from({ length: 7 }).map((__, j) => (
            <TableCell key={`sk-${String(i)}-${String(j)}`}>
              <Skeleton className="h-4 w-full" />
            </TableCell>
          ))}
        </TableRow>
      ));
    }

    if (rows.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={7} className="h-24 text-center text-sm text-muted-foreground">
            No indent requests yet.
          </TableCell>
        </TableRow>
      );
    }

    return rows.flatMap((row, index) => {
      const expanded = expandedIds.has(row.id);
      const serial = rowOffset + index + 1;
      return [
        <TableRow
          key={row.id}
          className="group cursor-pointer"
          onClick={() => toggleExpanded(row.id)}
        >
          <TableCell className="w-10 text-muted-foreground tabular-nums">{serial}</TableCell>
          <TableCell>
            <button
              type="button"
              className="font-mono text-sm text-primary hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {row.indent_number}
            </button>
          </TableCell>
          <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
            {formatIndentRequestDate(row.request_date)}
          </TableCell>
          <TableCell>{row.to_store_name}</TableCell>
          <TableCell className="text-xs tracking-wide text-muted-foreground">
            {indentPriorityLabel(row.priority)}
          </TableCell>
          <TableCell>
            <Badge variant="outline" className={indentStatusBadgeClass(row.status)}>
              {indentStatusLabel(row.status)}
            </Badge>
          </TableCell>
          <TableCell className="w-10 text-right">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8"
              aria-expanded={expanded}
              aria-label={expanded ? 'Collapse items' : 'Expand items'}
              onClick={(e) => {
                e.stopPropagation();
                toggleExpanded(row.id);
              }}
            >
              {expanded ? <Minus className="size-4" /> : <Plus className="size-4" />}
            </Button>
          </TableCell>
        </TableRow>,
        expanded ? <IndentLinesSubRow key={`${row.id}-lines`} lines={row.lines} /> : null,
      ].filter(Boolean);
    });
  }, [expandedIds, isLoading, rowOffset, rows]);

  return (
    <div className="flex flex-col gap-4">
      {toolbar}
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="w-10">#</TableHead>
              <TableHead>Indent #</TableHead>
              <TableHead>Request date</TableHead>
              <TableHead>To store</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>{tableBody}</TableBody>
        </Table>
      </div>
      <div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-muted-foreground">
          <span>Rows per page</span>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => {
              onPageSizeChange(Number(v));
              onPageChange(1);
            }}
          >
            <SelectTrigger className="h-8 w-[72px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[10, 25, 50].map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground">
            Page {page} of {pageCount}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            Previous
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= pageCount}
            onClick={() => onPageChange(page + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
