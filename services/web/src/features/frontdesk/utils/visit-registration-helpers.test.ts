import { describe, expect, it } from 'vitest';
import {
  billingLineDiscountAmount,
  billingLineNetPrice,
  billingLineTaxAmount,
  billingLineTotal,
  buildRegistrationVisitTypeOptions,
  buildVisitTypeDecisionPatientPayload,
  computeBillingGrandTotal,
  FOLLOW_UP_VISIT_TYPE_CODE,
  FREE_FOLLOW_UP_VISIT_TYPE_CODE,
  formatBillingDeduction,
  formatBillingInr,
  formatBillingTaxLine,
  formatBillingTaxSummary,
  isFollowUpVisitType,
  isFreeFollowUpVisitType,
  isVisitRegistrationAmountPaidValid,
  mapVisitRegistrationToExistingPatientIntakeBody,
  visitRegistrationFormBlockers,
  resolveRegistrationPatientId,
  visitTypeDecisionRequestKey,
} from '@/features/frontdesk/utils/visit-registration-helpers';
import type { CreateVisitRequestBody } from '@/features/frontdesk/types';

const baseLine = {
  unit_price: 100,
  tax_percent: 18,
  discount_percent: 0,
  discount: 0,
};

describe('billing line math', () => {
  it('computes net, tax, and total with percent discount', () => {
    const line = { ...baseLine, discount_percent: 10 };
    expect(billingLineDiscountAmount(line)).toBe(10);
    expect(billingLineNetPrice(line)).toBe(90);
    expect(billingLineTaxAmount(line)).toBe(16.2);
    expect(billingLineTotal(line)).toBe(106.2);
  });

  it('derives discount from percent when rupee amount is zero', () => {
    const line = { ...baseLine, discount_percent: 10 };
    expect(billingLineDiscountAmount(line)).toBe(10);
    expect(billingLineTotal(line)).toBe(106.2);
  });

  it('computes fractional tax on discounted net', () => {
    const line = { unit_price: 10, tax_percent: 10, discount_percent: 10, discount: 0 };
    expect(billingLineNetPrice(line)).toBe(9);
    expect(billingLineTaxAmount(line)).toBe(0.9);
    expect(billingLineTotal(line)).toBe(9.9);
  });

  it('derives rupee discount from percent only', () => {
    const line = { ...baseLine, discount_percent: 50, discount: 5 };
    expect(billingLineDiscountAmount(line)).toBe(50);
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

  it('accepts zero paid when grand total is zero', () => {
    expect(isVisitRegistrationAmountPaidValid(0, 0)).toBe(true);
    expect(isVisitRegistrationAmountPaidValid(1, 0)).toBe(false);
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

describe('formatBillingInr', () => {
  it('shows paise for fractional amounts', () => {
    expect(formatBillingInr(0.9)).toBe('₹0.90');
    expect(formatBillingInr(9)).toBe('₹9');
  });
});

describe('formatBillingTaxLine', () => {
  it('combines rate and amount on one line', () => {
    expect(formatBillingTaxLine(10, 0.9)).toBe('10% · ₹0.90');
  });

  it('shows 0 when rate is zero', () => {
    expect(formatBillingTaxLine(0, 0)).toBe('0');
  });
});

describe('resolveRegistrationPatientId', () => {
  it('prefers explicit patient id then resolved id', () => {
    expect(
      resolveRegistrationPatientId(
        'e704abf8-6eff-4b46-b431-fc8b05bef006',
        '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      ),
    ).toBe('6ba7b810-9dad-11d1-80b4-00c04fd430c8');
    expect(
      resolveRegistrationPatientId('e704abf8-6eff-4b46-b431-fc8b05bef006', undefined),
    ).toBe('e704abf8-6eff-4b46-b431-fc8b05bef006');
  });
});

describe('buildVisitTypeDecisionPatientPayload', () => {
  it('includes dedup demographics and normalizes phone to last 10 digits', () => {
    expect(
      buildVisitTypeDecisionPatientPayload({
        phone: '+91 9876543210',
        firstName: 'Test',
        lastName: 'Patient',
        gender: 'male',
        ageYears: 30,
      }),
    ).toEqual({
      phone_number: '9876543210',
      first_name: 'Test',
      last_name: 'Patient',
      gender: 'male',
      age_years: 30,
    });
  });

  it('omits gender when not a valid registration value', () => {
    expect(
      buildVisitTypeDecisionPatientPayload({
        phone: '9876543210',
        firstName: 'Test',
        gender: '',
      }),
    ).toEqual({
      phone_number: '9876543210',
      first_name: 'Test',
    });
  });
});

describe('visitTypeDecisionRequestKey', () => {
  it('changes when any dedup field changes', () => {
    const base = buildVisitTypeDecisionPatientPayload({
      phone: '9876543210',
      firstName: 'A',
      gender: 'male',
    });
    const otherPhone = buildVisitTypeDecisionPatientPayload({
      phone: '9123456789',
      firstName: 'A',
      gender: 'male',
    });
    expect(visitTypeDecisionRequestKey('dept-1', base)).not.toBe(
      visitTypeDecisionRequestKey('dept-1', otherPhone),
    );
  });
});

describe('buildRegistrationVisitTypeOptions', () => {
  it('injects a fallback option when the selected code is missing from the picklist', () => {
    const options = buildRegistrationVisitTypeOptions(
      [{ value: 'opd_first', label: 'OPD — First visit' }],
      FREE_FOLLOW_UP_VISIT_TYPE_CODE,
    );
    expect(options).toEqual([
      { value: 'opd_first', label: 'OPD — First visit' },
      { value: FREE_FOLLOW_UP_VISIT_TYPE_CODE, label: 'OPD — Free follow-up' },
    ]);
  });

  it('does not duplicate options when the picklist already contains the selected code', () => {
    const options = buildRegistrationVisitTypeOptions(
      [{ value: FREE_FOLLOW_UP_VISIT_TYPE_CODE, label: 'OPD — Free follow-up' }],
      FREE_FOLLOW_UP_VISIT_TYPE_CODE,
    );
    expect(options).toHaveLength(1);
  });
});

describe('isFollowUpVisitType', () => {
  it('recognizes master-data follow-up code variants', () => {
    expect(isFollowUpVisitType(FOLLOW_UP_VISIT_TYPE_CODE)).toBe(true);
    expect(isFollowUpVisitType('opd_follow_up')).toBe(true);
    expect(isFollowUpVisitType('OPD-Follow Up')).toBe(true);
    expect(isFollowUpVisitType('opd_first')).toBe(false);
    expect(isFreeFollowUpVisitType('opd_free_follow_up')).toBe(true);
  });
});

describe('mapVisitRegistrationToExistingPatientIntakeBody', () => {
  const form = {
    patient: { phone: '9876543210', first_name: 'Test', gender: 'male' as const },
    appointment: {
      visit_type_code: FOLLOW_UP_VISIT_TYPE_CODE,
      department_id: '550e8400-e29b-41d4-a716-446655440000',
      provider_id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
    },
  } as CreateVisitRequestBody;

  it('maps patient_id and encounter fields without demographics', () => {
    const body = mapVisitRegistrationToExistingPatientIntakeBody(
      form,
      'e704abf8-6eff-4b46-b431-fc8b05bef006',
    );
    expect(body).toEqual({
      patient_id: 'e704abf8-6eff-4b46-b431-fc8b05bef006',
      intake_completion: 'partial',
      visit_type: FOLLOW_UP_VISIT_TYPE_CODE,
      consultation_type: 'followup',
      department_id: '550e8400-e29b-41d4-a716-446655440000',
      doctor_id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
    });
    expect(body).not.toHaveProperty('patient');
  });
});

describe('visitRegistrationFormBlockers', () => {
  const complete = {
    phone: '9876543210',
    firstName: 'Test',
    gender: 'male' as const,
    departmentId: 'dept-1',
    providerId: 'doc-1',
    visitTypeCode: 'opd_first',
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

  it('passes when grand total and amount paid are both zero', () => {
    expect(
      visitRegistrationFormBlockers({ ...complete, grandTotal: 0, amountPaid: 0 }),
    ).toEqual([]);
  });

  it('rejects phone numbers starting with 0', () => {
    expect(
      visitRegistrationFormBlockers({ ...complete, phone: '0765432156' }),
    ).toContain('10-digit phone');
  });

  it('rejects phone numbers starting with 1–5', () => {
    expect(
      visitRegistrationFormBlockers({ ...complete, phone: '2345677888' }),
    ).toContain('10-digit phone');
  });

  it('requires gender selection', () => {
    expect(visitRegistrationFormBlockers({ ...complete, gender: '' })).toContain('gender');
    expect(visitRegistrationFormBlockers({ ...complete, gender: undefined })).toContain('gender');
  });
});
