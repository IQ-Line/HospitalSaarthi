import { Input } from '@pulse/ui/input';
import { Label } from '@pulse/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@pulse/ui/select';
import { cn } from '@pulse/utils';
import { formatInrAmount } from '../../lib/dispense-billing';
import type { DispensePaymentDraft } from '../../types/dispense-ui.types';

type DispenseBillingBarProps = {
  subtotal: number;
  lineDiscountTotal: number;
  lineTaxTotal: number;
  invoiceDiscount: number;
  onInvoiceDiscountChange: (value: number) => void;
  total: number;
  payment: DispensePaymentDraft;
  onPaymentChange: (payment: DispensePaymentDraft) => void;
  disabled?: boolean;
};

function SummaryChip({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap', className)}>
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </span>
  );
}

export function DispenseBillingBar({
  subtotal,
  lineDiscountTotal,
  lineTaxTotal,
  invoiceDiscount,
  onInvoiceDiscountChange,
  total,
  payment,
  onPaymentChange,
  disabled = false,
}: DispenseBillingBarProps) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 rounded-md border bg-muted/30 px-4 py-2.5 text-sm">
      <SummaryChip label="Subtotal" value={formatInrAmount(subtotal)} />
      {lineDiscountTotal > 0 ? (
        <SummaryChip
          label="Item disc."
          value={`−${formatInrAmount(lineDiscountTotal)}`}
          className="text-destructive"
        />
      ) : null}
      {lineTaxTotal > 0 ? (
        <SummaryChip label="Tax" value={formatInrAmount(lineTaxTotal)} />
      ) : null}
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
        <span className="text-muted-foreground">Inv. disc.</span>
        <Input
          type="number"
          min={0}
          step={1}
          disabled={disabled}
          aria-label="Invoice discount (₹)"
          className="h-8 w-[4.5rem] px-2 text-right text-sm tabular-nums"
          value={invoiceDiscount > 0 ? invoiceDiscount : ''}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            onInvoiceDiscountChange(Number.isFinite(v) ? Math.max(0, v) : 0);
          }}
          placeholder="0"
        />
      </span>
      <SummaryChip label="Total" value={formatInrAmount(total)} className="font-semibold" />
      <span className="hidden h-5 w-px shrink-0 bg-border sm:inline-block" aria-hidden />
      <div className="inline-flex items-center gap-2">
        <Label htmlFor="dispense-payment-mode" className="sr-only">
          Payment mode
        </Label>
        <Select
          value={payment.payment_mode || undefined}
          disabled={disabled}
          onValueChange={(v) => onPaymentChange({ ...payment, payment_mode: v })}
        >
          <SelectTrigger id="dispense-payment-mode" className="h-8 w-[7.5rem] text-xs">
            <SelectValue placeholder="Payment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cash">Cash</SelectItem>
            <SelectItem value="card">Card</SelectItem>
            <SelectItem value="upi">UPI</SelectItem>
            <SelectItem value="insurance">Insurance</SelectItem>
            <SelectItem value="credit">Credit</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
        <Label htmlFor="dispense-amount-paid" className="sr-only">
          Amount paid
        </Label>
        <Input
          id="dispense-amount-paid"
          type="number"
          min={0}
          step={1}
          disabled={disabled}
          placeholder="Paid"
          className="h-8 w-[5.5rem] px-2 text-right text-sm tabular-nums"
          value={payment.amount_paid}
          onChange={(e) => onPaymentChange({ ...payment, amount_paid: e.target.value })}
        />
      </div>
    </div>
  );
}
