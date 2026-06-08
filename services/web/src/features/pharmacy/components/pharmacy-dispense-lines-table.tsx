import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@pulse/ui/button';
import { Input } from '@pulse/ui/input';
import { formatInrAmount, lineTotal } from '../lib/dispense-billing';
import type { DispenseLineDraft } from '../types';
import { PharmacyMedicineSearchInput } from './pharmacy-medicine-search-input';

type PharmacyDispenseLinesTableProps = {
  lines: DispenseLineDraft[];
  onChange: (lines: DispenseLineDraft[]) => void;
  disabled?: boolean;
};

function updateLine(
  lines: DispenseLineDraft[],
  key: string,
  patch: Partial<DispenseLineDraft>,
): DispenseLineDraft[] {
  return lines.map((line) => (line.key === key ? { ...line, ...patch } : line));
}

export function PharmacyDispenseLinesTable({
  lines,
  onChange,
  disabled = false,
}: PharmacyDispenseLinesTableProps) {
  const addLine = () => {
    onChange([
      ...lines,
      {
        key: `new-${Date.now()}`,
        medicine_display_name: '',
        prescribed_quantity: '',
        quantity_dispensed: '1',
        unit_amount: '0',
        line_discount: '0',
        tax_percent: '0',
      },
    ]);
  };

  const removeLine = (key: string) => {
    if (lines.length <= 1) return;
    onChange(lines.filter((line) => line.key !== key));
  };

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[980px] border-collapse text-sm">
          <thead className="bg-[#F8FAFC]">
            <tr>
              {[
                'Medicine',
                'Prescribed qty',
                'Dispensed qty',
                'Unit price (₹)',
                'Discount (₹)',
                'Tax (%)',
                'Line total',
                '',
              ].map((label) => (
                <th
                  key={label || 'actions'}
                  className="px-3 py-3 text-left text-xs font-semibold tracking-wide text-muted-foreground"
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr key={line.key} className="border-t border-gray-100">
                <td className="px-3 py-2">
                  <PharmacyMedicineSearchInput
                    value={line.medicine_display_name}
                    disabled={disabled}
                    onChange={(medicine_display_name) =>
                      onChange(updateLine(lines, line.key, { medicine_display_name }))
                    }
                  />
                </td>
                <td className="px-3 py-2">
                  <Input
                    value={line.prescribed_quantity}
                    disabled={disabled}
                    onChange={(event) =>
                      onChange(updateLine(lines, line.key, { prescribed_quantity: event.target.value }))
                    }
                    placeholder="—"
                    className="w-24"
                  />
                </td>
                <td className="px-3 py-2">
                  <Input
                    value={line.quantity_dispensed}
                    disabled={disabled}
                    onChange={(event) =>
                      onChange(updateLine(lines, line.key, { quantity_dispensed: event.target.value }))
                    }
                    className="w-24"
                  />
                </td>
                <td className="px-3 py-2">
                  <Input
                    value={line.unit_amount}
                    disabled={disabled}
                    onChange={(event) =>
                      onChange(updateLine(lines, line.key, { unit_amount: event.target.value }))
                    }
                    className="w-28"
                  />
                </td>
                <td className="px-3 py-2">
                  <Input
                    value={line.line_discount}
                    disabled={disabled}
                    onChange={(event) =>
                      onChange(updateLine(lines, line.key, { line_discount: event.target.value }))
                    }
                    className="w-24"
                  />
                </td>
                <td className="px-3 py-2">
                  <Input
                    value={line.tax_percent}
                    disabled={disabled}
                    onChange={(event) =>
                      onChange(updateLine(lines, line.key, { tax_percent: event.target.value }))
                    }
                    className="w-20"
                  />
                </td>
                <td className="px-3 py-2 tabular-nums">
                  {formatInrAmount(
                    lineTotal(
                      line.quantity_dispensed,
                      line.unit_amount,
                      line.line_discount,
                      line.tax_percent,
                    ),
                  )}
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
            ))}
          </tbody>
        </table>
      </div>

      <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={addLine}>
        <Plus className="size-4" />
        Add line
      </Button>
    </div>
  );
}
