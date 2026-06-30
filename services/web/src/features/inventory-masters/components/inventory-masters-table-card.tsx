import type { ReactNode } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Filter } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@pulse/ui/select';
import { EntityTableToolbar } from '@/components/entity-table/entity-table-toolbar';
import { DataTable } from '@/components/data-table';
import { InventoryMasterRowActions } from './inventory-master-row-actions';
import type { InventoryMasterListParams } from '../types';

interface InventoryMastersTableCardProps<TData> {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  status: InventoryMasterListParams['status'];
  onStatusChange: (value: InventoryMasterListParams['status']) => void;
  extraFilters?: ReactNode;
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}

export function InventoryMastersTableCard<TData>({
  search,
  onSearchChange,
  searchPlaceholder,
  status,
  onStatusChange,
  extraFilters,
  columns,
  data,
  isLoading,
  emptyTitle,
  emptyDescription,
}: InventoryMastersTableCardProps<TData>) {
  return (
    <div className="rounded-lg border">
      <div className="flex flex-wrap items-center gap-3 border-b p-3">
        <EntityTableToolbar
          value={search}
          onChange={onSearchChange}
          placeholder={searchPlaceholder}
          debounceMs={0}
        />
        {extraFilters}
        <Select
          value={status ?? 'all'}
          onValueChange={(value) =>
            onStatusChange(value as InventoryMasterListParams['status'])
          }
        >
          <SelectTrigger className="w-[150px]">
            <Filter className="mr-1 size-4 text-muted-foreground" aria-hidden />
            <SelectValue placeholder="All status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="p-3 pt-0">
        <DataTable
          columns={columns}
          data={data}
          isLoading={isLoading}
          showColumnMenu
          emptyTitle={emptyTitle}
          emptyDescription={emptyDescription}
        />
      </div>
    </div>
  );
}

function IndexCell({ index }: { index: number }) {
  return <span className="text-muted-foreground tabular-nums">{index + 1}</span>;
}

export function inventoryMasterIndexColumn<TData>(): ColumnDef<TData, unknown> {
  return {
    id: 'index',
    header: '#',
    meta: { label: '#', headerClassName: 'w-12' },
    cell: ({ row }) => <IndexCell index={row.index} />,
  };
}

export function inventoryMasterActionsColumn<TData extends { id: string }>(options?: {
  onEdit?: (row: TData) => void;
  onDelete?: (row: TData) => void;
  canEdit?: boolean;
  canDelete?: boolean;
}): ColumnDef<TData, unknown> {
  return {
    id: 'actions',
    header: () => <div className="text-right">Actions</div>,
    meta: { label: 'Actions' },
    cell: ({ row }) => (
      <div className="flex justify-end">
        <InventoryMasterRowActions
          onEdit={options?.onEdit ? () => options.onEdit?.(row.original) : undefined}
          onDelete={options?.onDelete ? () => options.onDelete?.(row.original) : undefined}
          canEdit={options?.canEdit ?? true}
          canDelete={options?.canDelete ?? true}
        />
      </div>
    ),
  };
}
