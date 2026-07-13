import { useRef, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@pulse/ui/button';
import { Input } from '@pulse/ui/input';
import { resolveDispenseItemPricing } from '../api/dispense-item-pricing';
import {
  computePendingPrescribedQty,
  formatInrAmount,
  lineTotal,
} from '../lib/dispense-billing';
import { createEmptyDispenseLineDraft } from '../lib/dispense-line-draft';
import type { DispenseMedicineItemOption } from '../api/search-dispense-medicine-items';
import type { DispenseLineFieldErrors } from '../lib/validate-dispense-draft';
import type { DispenseLineDraft } from '../types';
import { EditPrescribedItemDialog } from './edit-prescribed-item-dialog';
import { PharmacyInventoryMedicineSearchInput } from './pharmacy-inventory-medicine-search-input';

type PharmacyDispenseLinesTableProps = {
  lines: DispenseLineDraft[];
  onChange: (lines: DispenseLineDraft[]) => void;
  disabled?: boolean;
  lineErrors?: Record<string, DispenseLineFieldErrors>;
  fullyDispensed?: boolean;
};

type EditingPrescribedLine = {
  key: string;
  prescribed_item_name: string;
  prescribed_quantity: string;
};

function updateLine(
  lines: DispenseLineDraft[],
  key: string,
  patch: Partial<DispenseLineDraft>,
): DispenseLineDraft[] {
  return lines.map((line) => (line.key === key ? { ...line, ...patch } : line));
}

function basketTotal(lines: readonly DispenseLineDraft[]): string {
  let sum = 0;
  for (const line of lines) {
    if (!line.medicine_id) continue;
    sum += Number(
      lineTotal(line.quantity_dispensed, line.unit_amount, line.line_discount, line.tax_percent),
    );
  }
  return sum.toFixed(4);
}

export function PharmacyDispenseLinesTable({
  lines,
  onChange,
  disabled = false,
  lineErrors,
  fullyDispensed = false,
}: PharmacyDispenseLinesTableProps) {
  const [editingPrescribed, setEditingPrescribed] = useState<EditingPrescribedLine | null>(null);
  const [pricingLineKey, setPricingLineKey] = useState<string | null>(null);
  const linesRef = useRef(lines);
  linesRef.current = lines;

  const applyIssuedItemSelection = async (lineKey: string, item: DispenseMedicineItemOption) => {
    const immediatePatch = {
      medicine_id: item.tenant_formulary_id,
      inventory_item_id: item.id,
      medicine_display_name: item.display_name,
      item_code: item.item_code,
      unit_amount: item.mrp || '0',
      tax_percent: item.gst_percent || '0',
    };
    onChange(updateLine(linesRef.current, lineKey, immediatePatch));

    setPricingLineKey(lineKey);
    try {
      const pricing = await resolveDispenseItemPricing(item);
      onChange(
        updateLine(linesRef.current, lineKey, {
          item_code: pricing.item_code,
          unit_amount: pricing.mrp,
          tax_percent: pricing.gst_percent,
        }),
      );
    } catch {
      // List-row values from immediatePatch remain on the line.
    } finally {
      setPricingLineKey((current) => (current === lineKey ? null : current));
    }
  };

  const addLine = () => {
    onChange([...lines, createEmptyDispenseLineDraft()]);
  };

  const removeLine = (key: string) => {
    if (lines.length <= 1) return;
    onChange(lines.filter((line) => line.key !== key));
  };

  const openEditPrescribed = (line: DispenseLineDraft) => {
    setEditingPrescribed({
      key: line.key,
      prescribed_item_name: line.prescribed_item_name,
      prescribed_quantity: line.prescribed_quantity,
    });
  };

  return (
    <div className="space-y-3">
      {fullyDispensed ? (
        <p className="text-sm text-muted-foreground">
          Dispensed items are shown below for reference only.
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[1240px] border-collapse text-sm">
          <thead className="bg-[#F8FAFC]">
            <tr>
              {[
                '#',
                'Item code',
                'Issued item',
                'Issued qty',
                'MRP',
                'GST (%)',
                'Amount',
                'Available',
                'Prescribed item',
                'Prescribed qty',
                'Action',
                '',
              ].map((label) => (
                <th
                  key={label || 'remove'}
                  className="px-3 py-3 text-left text-xs font-semibold tracking-wide text-muted-foreground"
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lines.map((line, index) => {
              const errors = lineErrors?.[line.key];
              const pendingQty = computePendingPrescribedQty(
                line.prescribed_quantity,
                line.quantity_dispensed,
              );
              const availableQty = Number(line.available_qty.trim());
              const issuedQty = Number(line.quantity_dispensed.trim());
              const stockShort =
                Number.isFinite(availableQty) &&
                line.available_qty.trim() !== '' &&
                Number.isFinite(issuedQty) &&
                issuedQty > availableQty;

              const pricingLoading = pricingLineKey === line.key;

              return (
                <tr key={line.key} className="border-t border-gray-100 align-top">
                  <td className="px-3 py-3 tabular-nums text-muted-foreground">{index + 1}</td>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                    {line.item_code.trim() || '—'}
                  </td>
                  <td className="px-3 py-2">
                    <PharmacyInventoryMedicineSearchInput
                      value={line.medicine_display_name}
                      formularyMedicineId={line.medicine_id}
                      disabled={disabled}
                      placeholder="Select or search item…"
                      error={errors?.medicine}
                      onClearSelection={() =>
                        onChange(
                          updateLine(lines, line.key, {
                            medicine_id: null,
                            inventory_item_id: null,
                            medicine_display_name: '',
                            item_code: '',
                            available_qty: '',
                            unit_amount: '0',
                            tax_percent: '0',
                          }),
                        )
                      }
                      onSelect={(item) => {
                        void applyIssuedItemSelection(line.key, item);
                      }}
                    />
                    {errors?.medicine ? (
                      <p className="mt-1 text-xs text-destructive">{errors.medicine}</p>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      value={line.quantity_dispensed}
                      disabled={disabled}
                      aria-invalid={Boolean(errors?.quantity_dispensed)}
                      onChange={(event) =>
                        onChange(updateLine(lines, line.key, { quantity_dispensed: event.target.value }))
                      }
                      className="w-20 text-right tabular-nums"
                    />
                    {pendingQty != null && pendingQty > 0 ? (
                      <p className="mt-1 text-xs text-muted-foreground">Pending {pendingQty}</p>
                    ) : null}
                    {stockShort ? (
                      <p className="mt-1 text-xs text-destructive">
                        Only {line.available_qty.trim()} in stock
                      </p>
                    ) : null}
                    {errors?.quantity_dispensed ? (
                      <p className="mt-1 max-w-28 text-xs text-destructive">{errors.quantity_dispensed}</p>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">
                    <div className="relative">
                      <Input
                        value={line.unit_amount}
                        readOnly
                        disabled={disabled || pricingLoading}
                        aria-invalid={Boolean(errors?.unit_amount)}
                        className="w-24 bg-muted/30 text-right tabular-nums"
                      />
                    </div>
                    {errors?.unit_amount ? (
                      <p className="mt-1 max-w-28 text-xs text-destructive">{errors.unit_amount}</p>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      value={line.tax_percent}
                      readOnly
                      disabled={disabled || pricingLoading}
                      aria-invalid={Boolean(errors?.tax_percent)}
                      className="w-20 bg-muted/30 text-right tabular-nums"
                    />
                    {errors?.tax_percent ? (
                      <p className="mt-1 max-w-24 text-xs text-destructive">{errors.tax_percent}</p>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 tabular-nums">
                    {line.medicine_id
                      ? formatInrAmount(
                          lineTotal(
                            line.quantity_dispensed,
                            line.unit_amount,
                            line.line_discount,
                            line.tax_percent,
                          ),
                        )
                      : '—'}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`tabular-nums ${stockShort ? 'font-medium text-destructive' : 'text-muted-foreground'}`}
                    >
                      {line.available_qty.trim() || '—'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-sm">
                    {line.prescribed_item_name.trim() || '—'}
                  </td>
                  <td className="px-3 py-2">
                    <div className="tabular-nums">{line.prescribed_quantity.trim() || '—'}</div>
                    {pendingQty != null ? (
                      <p className="mt-1 text-xs text-muted-foreground">Pending {pendingQty}</p>
                    ) : null}
                    {errors?.prescribed_quantity ? (
                      <p className="mt-1 max-w-28 text-xs text-destructive">{errors.prescribed_quantity}</p>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={disabled}
                      onClick={() => openEditPrescribed(line)}
                      aria-label="Edit prescribed item"
                    >
                      <Pencil className="size-4" />
                    </Button>
                  </td>
                  <td className="px-3 py-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={disabled || lines.length <= 1}
                      onClick={() => removeLine(line.key)}
                      aria-label="Remove line"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-gray-200 bg-[#F8FAFC]">
              <td colSpan={6} className="px-3 py-3 text-sm font-medium">
                Basket total
              </td>
              <td className="px-3 py-3 text-sm font-semibold tabular-nums">
                {formatInrAmount(basketTotal(lines))}
              </td>
              <td colSpan={5} />
            </tr>
          </tfoot>
        </table>
      </div>

      <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={addLine}>
        <Plus className="size-4" />
        Add line
      </Button>

      {editingPrescribed ? (
        <EditPrescribedItemDialog
          open
          onOpenChange={(open) => {
            if (!open) setEditingPrescribed(null);
          }}
          prescribedItemName={editingPrescribed.prescribed_item_name}
          prescribedQuantity={editingPrescribed.prescribed_quantity}
          onSave={(values) => {
            onChange(
              updateLine(lines, editingPrescribed.key, {
                prescribed_item_name: values.prescribed_item_name,
                prescribed_quantity: values.prescribed_quantity,
              }),
            );
            setEditingPrescribed(null);
          }}
        />
      ) : null}
    </div>
  );
}
