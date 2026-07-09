import type {
  DispenseAddressDraft,
  DispenseIssuedItemRow,
  DispensePatientDraft,
  DispensePatientSearchResult,
} from '../types/dispense-ui.types';
import { computeLineBilling } from './dispense-billing';

export function emptyDispenseAddress(): DispenseAddressDraft {
  return { line1: '', line2: '', city: '', state: '', district: '', pincode: '' };
}

export function emptyDispensePatientDraft(): DispensePatientDraft {
  return {
    patient_id: null,
    phone: '',
    first_name: '',
    middle_name: '',
    last_name: '',
    gender: '',
    date_of_birth: '',
    age_years: '',
    age_months: '',
    age_days: '',
    email: '',
    blood_group: '',
    uhid: '',
    abha_number: '',
    aadhaar: '',
    attendant_relation: '',
    attendant_name: '',
    attendant_phone: '',
    permanent_address: emptyDispenseAddress(),
    residential_address: emptyDispenseAddress(),
    residential_same_as_permanent: false,
    education: '',
    occupation: '',
    religion: '',
  };
}

let issuedRowCounter = 0;

export function createEmptyIssuedItemRow(): DispenseIssuedItemRow {
  issuedRowCounter += 1;
  return {
    key: `row-${issuedRowCounter}`,
    item_code: '',
    medicine_id: null,
    medicine_display_name: '',
    quantity: '',
    available_qty: '',
    batch: '',
    mrp: '0',
    line_discount: '0',
    tax_percent: '5',
  };
}

export function isIssuedRowStarted(row: DispenseIssuedItemRow): boolean {
  return Boolean(
    row.item_code.trim() ||
      row.medicine_display_name.trim() ||
      row.quantity.trim() ||
      row.batch.trim(),
  );
}

export function issuedRowLineTotal(row: DispenseIssuedItemRow): number {
  const { line_total } = computeLineBilling({
    quantity_dispensed: row.quantity || '0',
    unit_amount: row.mrp || '0',
    line_discount: row.line_discount,
    tax_percent: row.tax_percent,
  });
  return Number(line_total);
}

export function computeIssuedItemsBill(
  rows: readonly DispenseIssuedItemRow[],
  invoiceDiscount: number,
): {
  subtotal: number;
  lineDiscountTotal: number;
  lineTaxTotal: number;
  invoiceDiscount: number;
  total: number;
  startedCount: number;
} {
  let subtotal = 0;
  let lineDiscountTotal = 0;
  let lineTaxTotal = 0;
  let startedCount = 0;

  for (const row of rows) {
    if (!isIssuedRowStarted(row)) continue;
    startedCount += 1;
    const gross = Number(row.quantity || 0) * Number(row.mrp || 0);
    const lineDisc = Number(row.line_discount || 0);
    const billing = computeLineBilling({
      quantity_dispensed: row.quantity || '0',
      unit_amount: row.mrp || '0',
      line_discount: row.line_discount,
      tax_percent: row.tax_percent,
    });
    subtotal += gross;
    lineDiscountTotal += lineDisc;
    lineTaxTotal += Number(billing.tax_amount);
  }

  const total = Math.max(0, subtotal - lineDiscountTotal + lineTaxTotal - invoiceDiscount);

  return {
    subtotal,
    lineDiscountTotal,
    lineTaxTotal,
    invoiceDiscount,
    total,
    startedCount,
  };
}

export function patientDraftFromSearchResult(
  patient: DispensePatientSearchResult,
): DispensePatientDraft {
  return {
    ...emptyDispensePatientDraft(),
    patient_id: patient.id,
    first_name: patient.first_name,
    last_name: patient.last_name,
    phone: patient.phone.replace(/\D/g, '').slice(-10),
    gender: (patient.gender as DispensePatientDraft['gender']) || '',
    date_of_birth: patient.date_of_birth,
    email: patient.email,
    uhid: patient.uhid,
  };
}
