function proportionalAmount(total: string, partQty: number, wholeQty: number): string {
  const whole = Number(wholeQty);
  const totalNum = Number(total);
  if (!Number.isFinite(whole) || whole <= 0 || !Number.isFinite(totalNum) || totalNum <= 0) {
    return '0.0000';
  }
  if (!Number.isFinite(partQty) || partQty <= 0) {
    return '0.0000';
  }
  return ((totalNum * partQty) / whole).toFixed(4);
}

export function computeClientReturnAmount(
  line: {
    quantity_dispensed: string;
    unit_amount: string;
    line_discount: string;
    tax_amount: string;
  },
  returnQty: number,
): string {
  const dispensedQty = Number(line.quantity_dispensed);
  if (!Number.isFinite(returnQty) || returnQty <= 0 || !Number.isFinite(dispensedQty) || dispensedQty <= 0) {
    return '0.0000';
  }
  const gross = (returnQty * Number(line.unit_amount)).toFixed(4);
  const discount = proportionalAmount(line.line_discount, returnQty, dispensedQty);
  const tax = proportionalAmount(line.tax_amount, returnQty, dispensedQty);
  return Math.max(0, Number(gross) - Number(discount) + Number(tax)).toFixed(4);
}

export function formatReturnReason(reason: string): string {
  const labels: Record<string, string> = {
    wrong_medicine_dispensed: 'Wrong medicine dispensed',
    doctor_discontinued_medication: 'Doctor discontinued medication',
    duplicate_dispensing: 'Duplicate dispensing',
    excess_quantity_dispensed: 'Excess quantity dispensed',
    patient_refused_medicine: 'Patient refused medicine',
    other: 'Other',
  };
  return labels[reason] ?? reason;
}

export function formatMoney(value: string): string {
  const num = Number(value);
  if (!Number.isFinite(num)) return '₹0.00';
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDispenseDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
