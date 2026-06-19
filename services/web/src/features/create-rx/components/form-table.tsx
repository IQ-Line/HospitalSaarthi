import { Plus, Trash2 } from 'lucide-react';
import { cn } from '@pulse/utils';
import { Button } from '@pulse/ui/button';
import { Input } from '@pulse/ui/input';
import { FormTableCreatableSelect } from './form-table-creatable-select';
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

export type FormTableColumnType =
  | 'text'
  | 'number'
  | 'select'
  | 'creatable-select'
  | 'date'
  | 'dosage-man';

export interface DosageManSubKeys<T> {
  morning: keyof T & string;
  afternoon: keyof T & string;
  night: keyof T & string;
}

export interface FormTableColumn<T> {
  key: keyof T & string;
  label: string;
  type?: FormTableColumnType;
  width?: string;
  placeholder?: string;
  /** Label for the empty select option (defaults to "—"). */
  emptyOptionLabel?: string;
  options?: { label: string; value: string }[];
  dosageManSubKeys?: DosageManSubKeys<T>;
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
  /** `${rowId}:${fieldKey}` keys for cells that failed validation. */
  invalidCells?: ReadonlySet<string>;
  /** Highlights the whole table block when the section has validation errors. */
  highlightSection?: boolean;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, field: keyof T & string, value: string) => void;
}

function formatReadOnlyDosageMan<T extends { id: string }>(
  row: T,
  subKeys: DosageManSubKeys<T>,
): string {
  const morning = String(row[subKeys.morning] ?? '').trim() || '0';
  const afternoon = String(row[subKeys.afternoon] ?? '').trim() || '0';
  const night = String(row[subKeys.night] ?? '').trim() || '0';
  if (morning === '0' && afternoon === '0' && night === '0') return '—';
  return `${morning}-${afternoon}-${night}`;
}

function formatReadOnlyCellValue<T extends { id: string }>(
  row: T,
  col: FormTableColumn<T>,
): string {
  if (col.type === 'dosage-man' && col.dosageManSubKeys) {
    return formatReadOnlyDosageMan(row, col.dosageManSubKeys);
  }

  const raw = String(row[col.key] ?? '');
  const value = raw.trim();
  if (!value) return '—';
  if ((col.type === 'select' || col.type === 'creatable-select') && col.options) {
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
  invalidCells,
  highlightSection = false,
  onAdd,
  onRemove,
  onUpdate,
}: FormTableProps<T>) {
  const emptyText =
    emptyMessage ??
    (hideAdd ? `No ${title.toLowerCase()} added` : `No ${title.toLowerCase()} added. Click '${addButtonLabel}' to begin.`);

  const isCellInvalid = (rowId: string, field: string) =>
    invalidCells?.has(`${rowId}:${field}`) ?? false;

  const columnStyle = (width: string | undefined) =>
    width ? { width, minWidth: width } : undefined;

  return (
    <div
      className={cn(
        'rounded-md transition-colors',
        highlightSection && 'ring-2 ring-red-400 ring-offset-2',
      )}
    >
      {!hideTitle ? (
        <div className="mb-4 flex items-center justify-between">
          <h3
            className={cn(
              'text-base font-medium text-gray-700',
              highlightSection && 'text-red-700',
            )}
          >
            {title}
          </h3>
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
                  style={columnStyle(col.width)}
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
                    <TableCell key={col.key} style={columnStyle(col.width)}>
                      {readOnly ? (
                        <span className="block min-h-8 py-1.5 text-sm text-gray-900">
                          {formatReadOnlyCellValue(row, col)}
                        </span>
                      ) : col.type === 'dosage-man' && col.dosageManSubKeys ? (
                        <div className="flex items-center gap-0.5">
                          {(
                            [
                              { key: col.dosageManSubKeys.morning, placeholder: 'M' },
                              { key: col.dosageManSubKeys.afternoon, placeholder: 'A' },
                              { key: col.dosageManSubKeys.night, placeholder: 'N' },
                            ] as const
                          ).map((part, partIndex) => (
                            <div key={part.key} className="flex items-center gap-0.5">
                              {partIndex > 0 ? (
                                <span className="text-sm text-muted-foreground">-</span>
                              ) : null}
                              <Input
                                type="text"
                                inputMode="numeric"
                                value={(row[part.key] as string) ?? ''}
                                placeholder={part.placeholder}
                                onChange={(e) => onUpdate(index, part.key, e.target.value)}
                                aria-invalid={isCellInvalid(row.id, part.key)}
                                className={cn(
                                  'h-8 w-10 px-1 text-center text-sm placeholder:text-muted-foreground/60',
                                  isCellInvalid(row.id, part.key) &&
                                    'border-red-500 ring-1 ring-red-500 focus-visible:ring-red-500',
                                )}
                              />
                            </div>
                          ))}
                        </div>
                      ) : col.type === 'creatable-select' && col.options ? (
                        <FormTableCreatableSelect
                          value={(row[col.key] as string) ?? ''}
                          onChange={(next) => onUpdate(index, col.key, next)}
                          options={col.options}
                          placeholder={
                            catalogLoading ? 'Loading catalog…' : col.placeholder
                          }
                          disabled={catalogLoading}
                          invalid={isCellInvalid(row.id, col.key)}
                        />
                      ) : col.type === 'select' && col.options ? (
                        <Select
                          value={(row[col.key] as string) || '__none__'}
                          onValueChange={(v) =>
                            onUpdate(index, col.key, v === '__none__' ? '' : v)
                          }
                          disabled={catalogLoading}
                        >
                          <SelectTrigger
                            className={cn(
                              'h-8 text-sm',
                              isCellInvalid(row.id, col.key) &&
                                'border-red-500 ring-1 ring-red-500 focus:ring-red-500',
                            )}
                            aria-invalid={isCellInvalid(row.id, col.key)}
                          >
                            <SelectValue
                              placeholder={
                                catalogLoading ? 'Loading catalog…' : col.placeholder
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">
                              {col.emptyOptionLabel ?? '—'}
                            </SelectItem>
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
                          aria-invalid={isCellInvalid(row.id, col.key)}
                          className={cn(
                            'h-8 text-sm',
                            col.width && 'w-full min-w-0',
                            col.type === 'number' && 'tabular-nums',
                            isCellInvalid(row.id, col.key) &&
                              'border-red-500 ring-1 ring-red-500 focus-visible:ring-red-500',
                          )}
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
