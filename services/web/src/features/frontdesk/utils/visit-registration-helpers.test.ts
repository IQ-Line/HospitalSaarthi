import { describe, expect, it } from 'vitest';
import {
  billingLineDiscountAmount,
  billingLineNetPrice,
  billingLineTaxAmount,
  billingLineTotal,
  computeBillingGrandTotal,
  formatBillingDeduction,
  formatBillingTaxSummary,
  isVisitRegistrationAmountPaidValid,
  visitRegistrationFormBlockers,
} from '@/features/frontdesk/utils/visit-registration-helpers';

const baseLine = {
  unit_price: 100,
  tax_percent: 18,
  discount_percent: 0,
  discount: 0,
};

describe('billing line math', () => {
  it('computes net, tax, and total with rupee discount', () => {
    const line = { ...baseLine, discount: 10 };
    expect(billingLineDiscountAmount(line)).toBe(10);
    expect(billingLineNetPrice(line)).toBe(90);
    expect(billingLineTaxAmount(line)).toBe(18);
    expect(billingLineTotal(line)).toBe(108);
  });

  it('derives discount from percent when rupee amount is zero', () => {
    const line = { ...baseLine, discount_percent: 10 };
    expect(billingLineDiscountAmount(line)).toBe(10);
    expect(billingLineTotal(line)).toBe(108);
  });

  it('prefers explicit rupee discount over percent', () => {
    const line = { ...baseLine, discount_percent: 50, discount: 5 };
    expect(billingLineDiscountAmount(line)).toBe(5);
  });
});

describe('computeBillingGrandTotal', () => {
  it('subtracts invoice discount from line totals', () => {
    const reg = { ...baseLine };
    const consult = { unit_price: 0, tax_percent: 0, discount_percent: 0, discount: 0 };
    expect(computeBillingGrandTotal(reg, consult, 8)).toBe(110);
  });
});

describe('isVisitRegistrationAmountPaidValid', () => {
  it('accepts exact, floor, and ceiling of fractional total', () => {
    expect(isVisitRegistrationAmountPaidValid(109.5, 109.5)).toBe(true);
    expect(isVisitRegistrationAmountPaidValid(109, 109.5)).toBe(true);
    expect(isVisitRegistrationAmountPaidValid(110, 109.5)).toBe(true);
  });

  it('rejects zero and unrelated amounts', () => {
    expect(isVisitRegistrationAmountPaidValid(0, 109.5)).toBe(false);
    expect(isVisitRegistrationAmountPaidValid(108, 109.5)).toBe(false);
    expect(isVisitRegistrationAmountPaidValid(NaN, 109.5)).toBe(false);
  });
});

describe('formatBillingDeduction', () => {
  it('shows em dash for zero discount', () => {
    expect(formatBillingDeduction(0)).toBe('—');
  });

  it('prefixes positive amounts with minus', () => {
    expect(formatBillingDeduction(50)).toBe('-₹50');
  });
});

describe('formatBillingTaxSummary', () => {
  it('shows 0 without currency when tax is zero', () => {
    expect(formatBillingTaxSummary(0)).toBe('0');
  });
});
  const complete = {
    phone: '9876543210',
    firstName: 'Test',
    grandTotal: 100,
    amountPaid: 100,
    paymentMode: 'cash',
  };

  it('requires valid amount paid', () => {
    const blockers = visitRegistrationFormBlockers({ ...complete, amountPaid: 0 });
    expect(blockers.some((b) => b.startsWith('valid amount paid'))).toBe(true);
  });

  it('passes when amount paid matches floor of total', () => {
    expect(
      visitRegistrationFormBlockers({ ...complete, grandTotal: 109.5, amountPaid: 109 }),
    ).toEqual([]);
  });
});
