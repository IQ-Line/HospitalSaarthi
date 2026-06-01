import { Plus, Trash2 } from 'lucide-react';
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

export type FormTableColumnType = 'text' | 'number' | 'select' | 'date';

export interface FormTableColumn<T> {
  key: keyof T & string;
  label: string;
  type?: FormTableColumnType;
  width?: string;
  placeholder?: string;
  options?: { label: string; value: string }[];
}

interface FormTableProps<T extends { id: string }> {
  title: string;
  addButtonLabel: string;
  indexColumnLabel?: string;
  columns: FormTableColumn<T>[];
  rows: T[];
  readOnly?: boolean;
  emptyMessage?: string;
  hideAdd?: boolean;
  hideTitle?: boolean;
  /** Disables catalog-backed selects while tenant Visitpad masters are loading. */
  catalogLoading?: boolean;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, field: keyof T & string, value: string) => void;
}

function formatReadOnlyCellValue(
  raw: string,
  col: FormTableColumn<{ id: string }>,
): string {
  const value = raw.trim();
  if (!value) return '—';
  if (col.type === 'select' && col.options) {
    return col.options.find((opt) => opt.value === value)?.label ?? value;
  }
  return value;
}

export function FormTable<T extends { id: string }>({
  title,
  addButtonLabel,
  indexColumnLabel = 'Sl.No',
  columns,
  rows,
  readOnly = false,
  emptyMessage,
  hideAdd = false,
  hideTitle = false,
  catalogLoading = false,
  onAdd,
  onRemove,
  onUpdate,
}: FormTableProps<T>) {
  const emptyText =
    emptyMessage ??
    (hideAdd ? `No ${title.toLowerCase()} added` : `No ${title.toLowerCase()} added. Click '${addButtonLabel}' to begin.`);

  return (
    <div>
      {!hideTitle ? (
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-medium text-gray-700">{title}</h3>
          {!readOnly && !hideAdd ? (
          <Button
            type="button"
            size="sm"
            className="bg-[#0d9488] hover:bg-[#0f766e] text-white gap-1"
            onClick={onAdd}
          >
            <Plus className="size-4" />
            {addButtonLabel}
          </Button>
        ) : null}
        </div>
      ) : !readOnly && !hideAdd ? (
        <div className="mb-4 flex justify-end">
          <Button
            type="button"
            size="sm"
            className="bg-[#0d9488] hover:bg-[#0f766e] text-white gap-1"
            onClick={onAdd}
          >
            <Plus className="size-4" />
            {addButtonLabel}
          </Button>
        </div>
      ) : null}
      <div className="overflow-x-auto rounded-md border border-gray-200">
        <Table>
          <TableHeader>
            <TableRow className="bg-blue-50 hover:bg-blue-50">
              <TableHead className="w-12 text-xs font-semibold text-muted-foreground">
                {indexColumnLabel}
              </TableHead>
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  className="text-xs font-semibold text-muted-foreground"
                  style={col.width ? { width: col.width } : undefined}
                >
                  {col.label}
                </TableHead>
              ))}
              {!readOnly ? <TableHead className="w-10" /> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (readOnly ? 1 : 2)}
                  className="py-8 text-center text-sm text-gray-500"
                >
                  {emptyText}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, index) => (
                <TableRow key={row.id}>
                  <TableCell className="text-sm text-muted-foreground">{index + 1}</TableCell>
                  {columns.map((col) => (
                    <TableCell key={col.key}>
                      {readOnly ? (
                        <span className="block min-h-8 py-1.5 text-sm text-gray-900">
                          {formatReadOnlyCellValue(String(row[col.key] ?? ''), col)}
                        </span>
                      ) : col.type === 'select' && col.options ? (
                        <Select
                          value={(row[col.key] as string) || '__none__'}
                          onValueChange={(v) =>
                            onUpdate(index, col.key, v === '__none__' ? '' : v)
                          }
                          disabled={catalogLoading}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue
                              placeholder={
                                catalogLoading ? 'Loading catalog…' : col.placeholder
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">—</SelectItem>
                            {col.options.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          type={col.type === 'number' ? 'number' : col.type === 'date' ? 'date' : 'text'}
                          value={(row[col.key] as string) ?? ''}
                          placeholder={col.placeholder}
                          onChange={(e) => onUpdate(index, col.key, e.target.value)}
                          className="h-8 text-sm"
                        />
                      )}
                    </TableCell>
                  ))}
                  {!readOnly ? (
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 text-destructive"
                        onClick={() => onRemove(index)}
                        disabled={rows.length <= 1}
                        aria-label="Remove row"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
